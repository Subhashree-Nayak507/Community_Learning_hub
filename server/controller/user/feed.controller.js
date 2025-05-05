import Content from '../../models/content.model.js';
import Transaction from '../../models/transaction.model.js';
import User from '../../models/auth.model.js';
import ReportedContent from '../../models/report.model.js';
import { fetchRedditPosts } from '../../services/feed.service.js'; 

const PAGE_SIZE = 10;

export const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const query = {};
    const count = await Content.countDocuments(query);
    
    // If no content exists, fetch from external source and store
    if (count === 0) {
      const redditPosts = await fetchRedditPosts(); // Your function to fetch from Reddit
      
      // Save new posts to database
      await Promise.all(
        redditPosts.map(post => 
          Content.updateOne(
            { sourceId: post.sourceId },
            { 
              $setOnInsert: {
                ...post,
                metadata: {
                  ...post.metadata,
                  isPremium: post.metadata?.isPremium ?? true, // Ensure default
                  unlockCost: post.metadata?.unlockCost ?? 10  // Ensure default
                }
              }
            },
            { upsert: true }
          )
        )
      );
    }

    // Now get paginated content
    const [content, total] = await Promise.all([
      Content.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE),
      Content.countDocuments(query)
    ]);
   
    res.json({
      data: content,
      page,
      totalPages: Math.ceil(total / PAGE_SIZE)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const saveContent = async (req, res) => {
  try {
    const { contentId } = req.body;
    const userId = req.user._id;

    // Verify content exists
    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const user = await User.findById(userId);
    const isAlreadySaved = user.savedContent.includes(contentId);

    if (isAlreadySaved) {
      // 1. Remove from saved content
      await User.findByIdAndUpdate(
        userId,
        { $pull: { savedContent: contentId } }
      );

      // 2. Find and remove the earn transaction
      const transaction = await Transaction.findOneAndDelete({
        userId,
        'metadata.contentId': contentId,
        purpose: 'watch_content'
      });

      // 3. Deduct credits if transaction existed
      if (transaction) {
        await User.findByIdAndUpdate(
          userId,
          { $inc: { creditBalance: -transaction.amount } }
        );
      }

      return res.json({ 
        success: true,
        action: 'removed',
        message: 'Content removed from saved items',
        creditsDeducted: transaction?.amount || 0
      });
    } else {
      // Add to saved content
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { savedContent: contentId } }
      );

      // Create transaction
      await Transaction.create({
        userId,
        type: 'earn',
        amount: 5,
        purpose: 'watch_content',
        metadata: {
          contentId,
          details: 'Saved content for later viewing'
        }
      });

      // Update user credits
      await User.findByIdAndUpdate(
        userId,
        { $inc: { creditBalance: 5 } }
      );

      return res.json({ 
        success: true,
        action: 'added',
        message: 'Content added to saved items',
        creditsAdded: 5
      });
    }
  } catch (error) {
    console.error('Save content error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle save status',
      details: error.message
    });
  }
};

export const getSavedContent = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'savedContent',
        options: { sort: { createdAt: -1 } }
   } ).exec();

    res.json(user.savedContent || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const shareContent = async (req, res) => {
  try {
    const { contentId } = req.body;
    const userId = req.user._id;

    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    await Content.findByIdAndUpdate(contentId, {
      $inc: { 'metadata.shareCount': 1 }
    });

    await Transaction.create({
      userId,
      type: 'earn',
      amount: 10,
      purpose: 'share_content',
      metadata: {
        contentId,
        details: "shared",
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const reportContent = async (req, res) => {
  try {
    const { contentId, reason } = req.body;
    const userId = req.user._id;

    const content = await Content.findById(contentId);
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const existingReport = await ReportedContent.findOne({ 
      userId, 
      contentId 
    });
    if (existingReport) {
      return res.status(400).json({ 
        error: 'You have already reported this content' 
      });
    }

    const newReport = new ReportedContent({
      userId,
      contentId,
      reason,
      status: 'pending'
    });
    const updatedContent = await Content.findByIdAndUpdate(
      contentId,
      {
        $push: { 
          'metadata.reports': {
            reason,
            reportedBy: userId,
            createdAt: new Date()
          } 
        },
        $inc: { 'metadata.reportCount': 1 }
      },
      { new: true } 
    );
    await Promise.all([
      newReport.save()
    ]);

    res.status(201).json({ 
      success: true,
      message: 'Content reported successfully',
      reportCount: updatedContent.metadata.reportCount
    });

  } catch (error) {
    console.error('Error reporting content:', error);
    res.status(500).json({ 
      error: 'Failed to report content'
    });
  }
};