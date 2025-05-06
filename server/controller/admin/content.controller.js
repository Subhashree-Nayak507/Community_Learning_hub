
import userModel from '../../models/auth.model.js';
import Content from '../../models/content.model.js';
import ReportedContent from '../../models/report.model.js';

export const getContent = async (req, res) => {
  try {
    const { type = 'all' } = req.query; 
    
    const query = {};
    if (type === 'premium') query['metadata.isPremium'] = true;
    if (type === 'normal') query['metadata.isPremium'] = false;

    const content = await Content.find(query)
      .sort({ createdAt: -1 });

    // Transform response to clearly show content type
    const response = content.map(item => ({
      id: item._id,
      title: item.title,
      type: item.metadata.isPremium ? 'premium' : 'normal',
      preview: item.preview,
      createdAt: item.createdAt,
      // Include admin-only fields if request is from admin
      ...(req.user?.role === 'admin' && {
        reportCount: item.metadata.reportCount || 0,
        isHidden: item.isHidden
      })
    }));

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteContent = async (req, res) => {
  try {
    const { contentId } = req.params;
    const contentExists = await Content.exists({ _id: contentId });
    if (!contentExists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    await Promise.all([
      Content.findByIdAndDelete(contentId),
      ReportedContent.deleteMany({ contentId: contentId }),
      userModel.updateMany(
        { savedContent: contentId },
        { $pull: { savedContent: contentId } }
      )
    ]);
    
    res.status(200).json({ 
      success: true,
      message: `Content ${contentId} and all associated data deleted successfully`
    });

  } catch (error) {
    console.error(`Delete content error:`, error);
    res.status(500).json({
      error: 'Content deletion failed',
      details: error.message
    });
  }
};