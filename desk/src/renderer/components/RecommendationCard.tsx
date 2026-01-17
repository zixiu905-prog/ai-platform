import React, { useState } from 'react';
import { Recommendation, RecommendationType, RecommendationPriority } from '../services/recommendationService';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import recommendationService from '../services/recommendationService';

interface RecommendationCardProps {
  recommendation: Recommendation;
  onView?: (recommendation: Recommendation) => void;
  onAccept?: (recommendation: Recommendation) => void;
  onFeedback?: (recommendation: Recommendation, feedback: 'positive' | 'negative' | 'neutral') => void;
  showActions?: boolean;
  compact?: boolean;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommendation,
  onView,
  onAccept,
  onFeedback,
  showActions = true,
  compact = false
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const electronAPI = useElectronAPI();

  const getTypeIcon = (type: RecommendationType) => {
    switch (type) {
      case RecommendationType.CODE_SUGGESTION:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case RecommendationType.PROJECT_TEMPLATE:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        );
      case RecommendationType.WORKFLOW_RECOMMENDATION:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case RecommendationType.SCRIPT_RECOMMENDATION:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        );
      case RecommendationType.BEST_PRACTICE:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case RecommendationType.LEARNING_PATH:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getTypeLabel = (type: RecommendationType) => {
    switch (type) {
      case RecommendationType.CODE_SUGGESTION:
        return '代码建议';
      case RecommendationType.PROJECT_TEMPLATE:
        return '项目模板';
      case RecommendationType.WORKFLOW_RECOMMENDATION:
        return '工作流';
      case RecommendationType.SCRIPT_RECOMMENDATION:
        return '脚本推荐';
      case RecommendationType.BEST_PRACTICE:
        return '最佳实践';
      case RecommendationType.LEARNING_PATH:
        return '学习路径';
      default:
        return '推荐';
    }
  };

  const getPriorityColor = (priority: RecommendationPriority) => {
    switch (priority) {
      case RecommendationPriority.URGENT:
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case RecommendationPriority.HIGH:
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case RecommendationPriority.MEDIUM:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case RecommendationPriority.LOW:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityLabel = (priority: RecommendationPriority) => {
    switch (priority) {
      case RecommendationPriority.URGENT:
        return '紧急';
      case RecommendationPriority.HIGH:
        return '高';
      case RecommendationPriority.MEDIUM:
        return '中';
      case RecommendationPriority.LOW:
        return '低';
      default:
        return '中';
    }
  };

  const handleView = async () => {
    setIsLoading(true);
    try {
      await recommendationService.markAsViewed([recommendation.id]);
      onView?.(recommendation);
      setShowDetails(!showDetails);
    } catch (error) {
      console.error('标记推荐为已查看失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      await recommendationService.acceptRecommendation(recommendation.id);
      onAccept?.(recommendation);
    } catch (error) {
      console.error('接受推荐失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (feedback: 'positive' | 'negative' | 'neutral') => {
    setIsLoading(true);
    try {
      await recommendationService.submitFeedback({
        recommendationId: recommendation.id,
        feedback
      });
      setFeedbackSubmitted(true);
      onFeedback?.(recommendation, feedback);
    } catch (error) {
      console.error('提交推荐反馈失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (recommendation.type === RecommendationType.CODE_SUGGESTION) {
      return (
        <div className="space-y-2">
          {recommendation.content.suggestions && (
            <div>
              <h4 className="text-sm font-semibold text-blue-300 mb-1">建议:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                {recommendation.content.suggestions.map((suggestion: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-blue-400 mr-2">•</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recommendation.content.code && (
            <div>
              <h4 className="text-sm font-semibold text-green-300 mb-1">代码示例:</h4>
              <pre className="bg-black/30 text-xs text-gray-300 p-2 rounded overflow-x-auto">
                <code>{recommendation.content.code}</code>
              </pre>
            </div>
          )}
        </div>
      );
    }

    if (recommendation.type === RecommendationType.PROJECT_TEMPLATE) {
      return (
        <div className="space-y-2">
          {recommendation.content.features && (
            <div>
              <h4 className="text-sm font-semibold text-purple-300 mb-1">功能特性:</h4>
              <div className="flex flex-wrap gap-1">
                {recommendation.content.features.map((feature: string, index: number) => (
                  <span key={index} className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (recommendation.type === RecommendationType.BEST_PRACTICE) {
      return (
        <div className="space-y-2">
          {recommendation.content.practices && (
            <div>
              <h4 className="text-sm font-semibold text-green-300 mb-1">实践要点:</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                {recommendation.content.practices.map((practice: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="text-green-400 mr-2">✓</span>
                    {practice}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recommendation.content.resources && (
            <div>
              <h4 className="text-sm font-semibold text-blue-300 mb-1">相关资源:</h4>
              <ul className="text-sm text-blue-300 space-y-1">
                {recommendation.content.resources.map((resource: any, index: number) => (
                  <li key={index}>
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="hover:text-blue-200 transition-colors"
                    >
                      • {resource.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    // 默认内容渲染
    return (
      <div className="text-sm text-gray-300">
        {JSON.stringify(recommendation.content, null, 2)}
      </div>
    );
  };

  if (compact) {
    return (
      <div className="glass-card p-3 rounded-lg hover:bg-white/10 transition-all duration-200 cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-blue-400">
              {getTypeIcon(recommendation.type)}
            </div>
            <div>
              <h4 className="text-sm font-medium text-white group-hover:text-blue-300 transition-colors">
                {recommendation.title}
              </h4>
              <p className="text-xs text-gray-400 truncate">
                {recommendation.description}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(recommendation.priority)}`}>
              {getPriorityLabel(recommendation.priority)}
            </span>
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-xs text-gray-400">{Math.round(recommendation.relevanceScore * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-lg hover:shadow-glow transition-all duration-300">
      {/* 头部 */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="text-blue-400">
            {getTypeIcon(recommendation.type)}
          </div>
          <div>
            <h3 className="font-semibold text-white mb-1">{recommendation.title}</h3>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-gray-400">{getTypeLabel(recommendation.type)}</span>
              <span className={`text-xs px-2 py-1 rounded border ${getPriorityColor(recommendation.priority)}`}>
                {getPriorityLabel(recommendation.priority)}
              </span>
              <span className="text-xs text-gray-400">
                相关性: {Math.round(recommendation.relevanceScore * 100)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 描述 */}
      <p className="text-sm text-gray-300 mb-3">{recommendation.description}</p>

      {/* 详细内容 */}
      {showDetails && (
        <div className="mb-4 p-3 bg-black/20 rounded-lg">
          {renderContent()}
        </div>
      )}

      {/* 操作按钮 */}
      {showActions && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleView}
              disabled={isLoading}
              className="btn-secondary text-xs px-3 py-1"
            >
              {showDetails ? '收起详情' : '查看详情'}
            </button>
            
            {!showDetails && (
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="btn-primary text-xs px-3 py-1"
              >
                应用推荐
              </button>
            )}
          </div>

          {!feedbackSubmitted && (
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-400 mr-2">有用吗？</span>
              <button
                onClick={() => handleFeedback('positive')}
                disabled={isLoading}
                className="p-1 hover:bg-green-500/20 rounded transition-colors"
                title="有用"
              >
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button
                onClick={() => handleFeedback('negative')}
                disabled={isLoading}
                className="p-1 hover:bg-red-500/20 rounded transition-colors"
                title="没用"
              >
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>
            </div>
          )}

          {feedbackSubmitted && (
            <span className="text-xs text-green-400">感谢您的反馈！</span>
          )}
        </div>
      )}

      {/* 元数据 */}
      <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          创建于 {recommendation.createdAt.toLocaleDateString()}
        </span>
        {recommendation.expiresAt && (
          <span className="text-xs text-orange-400">
            过期于 {recommendation.expiresAt.toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

export default RecommendationCard;