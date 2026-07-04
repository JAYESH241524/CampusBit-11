import prisma from '../utils/db.js';

// Create a new event post (Institute Admin only)
export const createEvent = async (req, res) => {
  const { title, description, bannerUrl, eventDate, category, registrationLink } = req.body;
  const { instituteId } = req.user;

  if (!title || !description || !bannerUrl || !eventDate || !category) {
    return res.status(400).json({ message: 'Title, description, bannerUrl, date, and category are required' });
  }

  try {
    const institute = await prisma.institute.findUnique({ where: { id: instituteId } });
    if (!institute) {
      return res.status(404).json({ message: 'Institute not found' });
    }

    const event = await prisma.event.create({
      data: {
        instituteId,
        instituteName: institute.name,
        title,
        description,
        bannerUrl,
        eventDate: new Date(eventDate),
        category,
        registrationLink
      }
    });

    return res.status(201).json({ message: 'Event posted successfully', event });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get Instagram-style event feed
export const getEventsFeed = async (req, res) => {
  const { page = 1, limit = 5, category, instituteId } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const where = {};
    if (category) where.category = category;
    if (instituteId) where.instituteId = instituteId;

    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit)
    });

    // Populate counts and whether current user liked it
    const userId = req.user?.id; // Can be empty if public but authenticated in our app

    const feedItems = await Promise.all(
      events.map(async (event) => {
        const likeCount = await prisma.eventLike.count({ where: { eventId: event.id } });
        const commentCount = await prisma.eventComment.count({ where: { eventId: event.id, isDeleted: false } });
        
        let hasLiked = false;
        if (userId) {
          const like = await prisma.eventLike.findUnique({
            where: {
              eventId_studentId: {
                eventId: event.id,
                studentId: userId
              }
            }
          });
          hasLiked = !!like;
        }

        return {
          ...event,
          likeCount,
          commentCount,
          hasLiked
        };
      })
    );

    return res.json({
      events: feedItems,
      page: parseInt(page),
      hasMore: events.length === parseInt(limit)
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Toggle like on an event (Student only)
export const toggleLikeEvent = async (req, res) => {
  const { eventId } = req.params;
  const studentId = req.user.id;

  try {
    const existingLike = await prisma.eventLike.findUnique({
      where: {
        eventId_studentId: {
          eventId,
          studentId
        }
      }
    });

    if (existingLike) {
      await prisma.eventLike.delete({
        where: {
          eventId_studentId: {
            eventId,
            studentId
          }
        }
      });
      return res.json({ liked: false, message: 'Unliked event' });
    } else {
      await prisma.eventLike.create({
        data: {
          eventId,
          studentId
        }
      });
      return res.json({ liked: true, message: 'Liked event' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Get flat comments list for an event
export const getEventComments = async (req, res) => {
  const { eventId } = req.params;

  try {
    const comments = await prisma.eventComment.findMany({
      where: { eventId, isDeleted: false },
      orderBy: { createdAt: 'asc' }
    });

    return res.json(comments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Add comment to an event (Student only)
export const addEventComment = async (req, res) => {
  const { eventId } = req.params;
  const { commentText } = req.body;
  const studentId = req.user.id;
  const studentName = req.user.name;

  if (!commentText || commentText.trim() === '') {
    return res.status(400).json({ message: 'Comment text cannot be empty' });
  }

  try {
    const comment = await prisma.eventComment.create({
      data: {
        eventId,
        studentId,
        studentName,
        commentText
      }
    });
    return res.status(201).json(comment);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Edit a comment (Student edit their own)
export const editEventComment = async (req, res) => {
  const { commentId } = req.params;
  const { commentText } = req.body;
  const studentId = req.user.id;

  if (!commentText || commentText.trim() === '') {
    return res.status(400).json({ message: 'Comment text cannot be empty' });
  }

  try {
    const comment = await prisma.eventComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }
    if (comment.studentId !== studentId) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    const updated = await prisma.eventComment.update({
      where: { id: commentId },
      data: { commentText }
    });

    return res.json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete a comment (Student deletes their own, or Institute Admin deletes on their post)
export const deleteEventComment = async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;
  const userInstituteId = req.user.instituteId;

  try {
    const comment = await prisma.eventComment.findUnique({ where: { id: commentId } });
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    let authorized = false;

    // Check if commenter
    if (comment.studentId === userId) {
      authorized = true;
    } else if (userRole === 'INSTITUTE_ADMIN') {
      // Check if this comment belongs to an event of the Admin's institute
      const event = await prisma.event.findUnique({ where: { id: comment.eventId } });
      if (event && event.instituteId === userInstituteId) {
        authorized = true;
      }
    }

    if (!authorized) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    await prisma.eventComment.update({
      where: { id: commentId },
      data: { isDeleted: true }
    });

    return res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};
