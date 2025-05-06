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
    
    if (count === 0) {
      const redditPosts = await fetchRedditPosts(); 
      await Promise.all(
        redditPosts.map(post => 
          Content.updateOne(
            { sourceId: post.sourceId },
            { 
              $setOnInsert: {
                ...post,
                metadata: {
                  ...post.metadata,
                  isPremium: post.metadata?.isPremium ?? true, 
                  unlockCost: post.metadata?.unlockCost ?? 10  
                }
              }
            },
            { upsert: true }
          )
        )
      );
    }
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

export const premiumContent = async (req, res) => {
  try {
    const premiumContents = await Content.find({ 
      'metadata.isPremium': true 
    })
    .sort({ createdAt: -1 })
    .lean();

    const formattedContent = premiumContents.map(content => ({
      _id: content._id,
      title: content.title,
      preview: content.preview,
      originalUrl: content.originalUrl,
      metadata: {
        isPremium: content.metadata.isPremium,
        unlockCost: content.metadata.unlockCost
      },
      createdAt: content.createdAt
    }));

    res.status(200).json({
      success: true,
      count: premiumContents.length,
      data: formattedContent
    });

  } catch (error) {
    console.error('Premium Content Error:', error);
    res.status(500).json({
      message: 'Failed to fetch premium content',
    });
  }
};