import React, { useState, useEffect, useCallback } from 'react';
import { Recommendation, RecommendationType, RecommendationPriority } from '../services/recommendationService';
import { RecommendationCard } from './RecommendationCard';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import recommendationService from '../services/recommendationService';

interface RecommendationListProps {
  type?: RecommendationType;
  priority?: RecommendationPriority;
  limit?: number;
  showFilters?: boolean;
  showSearch?: boolean;
  compact?: boolean;
  onRecommendationSelect?: (recommendation: Recommendation) => void;
}

export const RecommendationList: React.FC<RecommendationListProps> = ({
  type,
  priority,
  limit = 10,
  showFilters = true,
  showSearch = true,
  compact = false,
  onRecommendationSelect
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filteredRecommendations, setFilteredRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedType, setSelectedType] = useState<RecommendationType | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<RecommendationPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'priority'>('relevance');
  const [viewedRecommendations, setViewedRecommendations] = useState<Set<string>>(new Set());
  const electronAPI = useElectronAPI();

  // 加载推荐
  const loadRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const context = {
        currentProject: await getCurrentProject(),
        currentFile: await getCurrentFile(),
        userActivity: await getUserActivity()
      };

      const newRecommendations = await recommendationService.getRecommendations({
        type,
        limit,
        context
      });

      setRecommendations(newRecommendations);
      setFilteredRecommendations(newRecommendations);

    } catch (err) {
      console.error('加载推荐失败:', err);
      setError(err instanceof Error ? err.message : '加载推荐失败');
    } finally {
      setLoading(false);
    }
  }, [type, limit]);

  // 刷新推荐
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const context = {
        currentProject: await getCurrentProject(),
        currentFile: await getCurrentFile(),
        userActivity: await getUserActivity()
      };

      const newRecommendations = await recommendationService.refreshRecommendations(context);
      setRecommendations(newRecommendations);
      setFilteredRecommendations(newRecommendations);

    } catch (err) {
      console.error('刷新推荐失败:', err);
      setError(err instanceof Error ? err.message : '刷新推荐失败');
    } finally {
      setRefreshing(false);
    }
  };

  // 处理推荐查看
  const handleViewRecommendation = async (recommendation: Recommendation) => {
    setViewedRecommendations(prev => new Set([...prev, recommendation.id]));
    onRecommendationSelect?.(recommendation);
  };

  // 处理推荐接受
  const handleAcceptRecommendation = async (recommendation: Recommendation) => {
    try {
      // 记录用户活动
      await recommendationService.recordUserActivity({
        action: 'accept_recommendation',
        target: recommendation.id,
        targetType: recommendation.type,
        metadata: {
          title: recommendation.title,
          type: recommendation.type
        }
      });

      // 通知应用推荐已接受
      if (electronAPI) {
        electronAPI.invoke('recommendation-accepted', {
          recommendation: recommendation
        });
      }

    } catch (err) {
      console.error('处理推荐接受失败:', err);
    }
  };

  // 处理推荐反馈
  const handleRecommendationFeedback = async (recommendation: Recommendation, feedback: 'positive' | 'negative' | 'neutral') => {
    try {
      // 记录用户活动
      await recommendationService.recordUserActivity({
        action: 'recommendation_feedback',
        target: recommendation.id,
        targetType: recommendation.type,
        metadata: {
          feedback,
          title: recommendation.title,
          type: recommendation.type
        }
      });

    } catch (err) {
      console.error('处理推荐反馈失败:', err);
    }
  };

  // 过滤和排序推荐
  useEffect(() => {
    let filtered = [...recommendations];

    // 类型过滤
    if (selectedType !== 'all') {
      filtered = filtered.filter(rec => rec.type === selectedType);
    }

    // 优先级过滤
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(rec => rec.priority === selectedPriority);
    }

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(rec =>
        rec.title.toLowerCase().includes(query) ||
        rec.description.toLowerCase().includes(query)
      );
    }

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'relevance':
          return b.relevanceScore - a.relevanceScore;
        case 'date':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        default:
          return 0;
      }
    });

    setFilteredRecommendations(filtered);
  }, [recommendations, selectedType, selectedPriority, searchQuery, sortBy]);

  // 初始加载
  useEffect(() => {
    loadRecommendations();
  }, [loadRecommendations]);

  // 定期刷新
  useEffect(() => {
    const interval = setInterval(() => {
      loadRecommendations();
    }, 5 * 60 * 1000); // 每5分钟刷新一次

    return () => clearInterval(interval);
  }, [loadRecommendations]);

  // 获取当前项目
  const getCurrentProject = async (): Promise<string | undefined> => {
    try {
      if (electronAPI && electronAPI.store) {
        return await electronAPI.store.get('current.project.id');
      }
    } catch (err) {
      console.error('获取当前项目失败:', err);
    }
    return undefined;
  };

  // 获取当前文件
  const getCurrentFile = async (): Promise<string | undefined> => {
    try {
      if (electronAPI && electronAPI.store) {
        return await electronAPI.store.get('current.file.path');
      }
    } catch (err) {
      console.error('获取当前文件失败:', err);
    }
    return undefined;
  };

  // 获取用户活动
  const getUserActivity = async (): Promise<string[]> => {
    try {
      if (electronAPI && electronAPI.store) {
        return await electronAPI.store.get('user.recent.activities') || [];
      }
    } catch (err) {
      console.error('获取用户活动失败:', err);
    }
    return [];
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

  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-400">正在加载推荐...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadRecommendations}
            className="btn-primary"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 过滤器和搜索 */}
      {(showFilters || showSearch) && (
        <div className="glass p-4 rounded-lg">
          <div className="flex flex-wrap items-center gap-4">
            {/* 搜索 */}
            {showSearch && (
              <div className="flex-1 min-w-64">
                <input
                  type="text"
                  placeholder="搜索推荐..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-glass w-full"
                />
              </div>
            )}

            {/* 类型过滤 */}
            {showFilters && (
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as RecommendationType | 'all')}
                className="input-glass min-w-32"
              >
                <option value="all">所有类型</option>
                {Object.values(RecommendationType).map(type => (
                  <option key={type} value={type}>{getTypeLabel(type)}</option>
                ))}
              </select>
            )}

            {/* 优先级过滤 */}
            {showFilters && (
              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value as RecommendationPriority | 'all')}
                className="input-glass min-w-24"
              >
                <option value="all">所有优先级</option>
                <option value="urgent">紧急</option>
                <option value="high">高</option>
                <option value="medium">中</option>
                <option value="low">低</option>
              </select>
            )}

            {/* 排序 */}
            {showFilters && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'relevance' | 'date' | 'priority')}
                className="input-glass min-w-32"
              >
                <option value="relevance">按相关性</option>
                <option value="date">按时间</option>
                <option value="priority">按优先级</option>
              </select>
            )}

            {/* 刷新按钮 */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-secondary"
              title="刷新推荐"
            >
              <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 推荐列表 */}
      {filteredRecommendations.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="text-gray-400 mb-2">
            {searchQuery.trim() ? '没有找到匹配的推荐' : '暂无推荐'}
          </p>
          <p className="text-sm text-gray-500">
            {searchQuery.trim() ? '请尝试其他搜索词' : '系统正在为您生成个性化推荐'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecommendations.map((recommendation) => (
            <RecommendationCard
              key={recommendation.id}
              recommendation={recommendation}
              compact={compact}
              onView={handleViewRecommendation}
              onAccept={handleAcceptRecommendation}
              onFeedback={handleRecommendationFeedback}
            />
          ))}
        </div>
      )}

      {/* 状态栏 */}
      {!compact && filteredRecommendations.length > 0 && (
        <div className="glass p-3 rounded-lg flex items-center justify-between">
          <div className="text-sm text-gray-400">
            显示 {filteredRecommendations.length} 个推荐
          </div>
          <div className="flex items-center space-x-4 text-xs text-gray-500">
            <span>已查看: {viewedRecommendations.size}</span>
            <span>相关性排序</span>
            <span>自动刷新已启用</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecommendationList;