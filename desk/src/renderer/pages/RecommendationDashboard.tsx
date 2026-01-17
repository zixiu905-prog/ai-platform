import React, { useState, useEffect } from 'react';
import { Recommendation, RecommendationStats, RecommendationType } from '../services/recommendationService';
import { RecommendationList } from '../components/RecommendationList';
import { RecommendationCard } from '../components/RecommendationCard';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import recommendationService from '../services/recommendationService';

export const RecommendationDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'recommendations' | 'stats' | 'history' | 'settings'>('recommendations');
  const [stats, setStats] = useState<RecommendationStats | null>(null);
  const [recentRecommendations, setRecentRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const electronAPI = useElectronAPI();

  // 加载统计数据
  const loadStats = async () => {
    try {
      const statsData = await recommendationService.getRecommendationStats();
      setStats(statsData);
    } catch (error) {
      console.error('加载推荐统计失败:', error);
    }
  };

  // 加载最近推荐
  const loadRecentRecommendations = async () => {
    try {
      const recent = await recommendationService.getRecommendations({ limit: 5 });
      setRecentRecommendations(recent);
    } catch (error) {
      console.error('加载最近推荐失败:', error);
    }
  };

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          loadStats(),
          loadRecentRecommendations()
        ]);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  // 监听推荐更新事件
  useEffect(() => {
    if (electronAPI) {
      electronAPI.on('recommendation-updated', () => {
        loadStats();
        loadRecentRecommendations();
      });
    }

    return () => {
      if (electronAPI && electronAPI.off) {
        // @ts-ignore
        electronAPI.off('recommendation-updated');
      }
    };
  }, [electronAPI]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="loading-spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-400">正在加载推荐仪表板...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900/20 to-purple-900/20">
      {/* 页面标题 */}
      <div className="glass-panel m-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient mb-2">AI智能推荐</h1>
            <p className="text-gray-400">
              基于您的使用习惯和偏好，为您推荐最适合的开发资源和工作流程
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">
                {stats?.total || 0}
              </div>
              <div className="text-xs text-gray-400">总推荐数</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {stats?.acceptanceRate ? Math.round(stats.acceptanceRate) : 0}%
              </div>
              <div className="text-xs text-gray-400">接受率</div>
            </div>
          </div>
        </div>
      </div>

      {/* 选项卡 */}
      <div className="mx-6 mb-4">
        <div className="tabs">
          {[
            { id: 'recommendations', label: '智能推荐', icon: '🤖' },
            { id: 'stats', label: '统计分析', icon: '📊' },
            { id: 'history', label: '推荐历史', icon: '📚' },
            { id: 'settings', label: '推荐设置', icon: '⚙️' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab-item flex items-center space-x-2 ${
                activeTab === tab.id ? 'active' : ''
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="mx-6 pb-6">
        {activeTab === 'recommendations' && (
          <div>
            {/* 快速推荐 */}
            {recentRecommendations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                  <span className="mr-2">🔥</span>
                  热门推荐
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentRecommendations.map((recommendation) => (
                    <RecommendationCard
                      key={recommendation.id}
                      recommendation={recommendation}
                      compact={true}
                      showActions={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 推荐列表 */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">全部推荐</h2>
              <RecommendationList limit={20} />
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {stats ? (
              <>
                {/* 统计卡片 */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">总推荐数</p>
                        <p className="text-2xl font-bold text-blue-400">{stats.total}</p>
                      </div>
                      <svg className="w-8 h-8 text-blue-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">已查看</p>
                        <p className="text-2xl font-bold text-purple-400">{stats.viewed}</p>
                      </div>
                      <svg className="w-8 h-8 text-purple-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">已接受</p>
                        <p className="text-2xl font-bold text-green-400">{stats.accepted}</p>
                      </div>
                      <svg className="w-8 h-8 text-green-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>

                  <div className="glass-card p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">接受率</p>
                        <p className="text-2xl font-bold text-orange-400">
                          {Math.round(stats.acceptanceRate)}%
                        </p>
                      </div>
                      <svg className="w-8 h-8 text-orange-400/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* 类型统计 */}
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">推荐类型分布</h3>
                  <div className="space-y-3">
                    {stats.typeStats.map((typeStat, index) => (
                      <div key={typeStat.type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-gray-300">
                            {getTypeLabel(typeStat.type as RecommendationType)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="text-white font-medium">{typeStat.count}</div>
                          <div className="w-24 bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-gradient-to-r from-blue-400 to-purple-400 h-2 rounded-full"
                              style={{ 
                                width: `${stats.total > 0 ? (typeStat.count / stats.total) * 100 : 0}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400">暂无统计数据</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">推荐历史</h2>
            <RecommendationList 
              showFilters={true} 
              showSearch={true}
              limit={50}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold text-white mb-4">推荐设置</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  自动刷新频率
                </label>
                <select className="input-glass w-full max-w-xs">
                  <option value="1">每分钟</option>
                  <option value="5">每5分钟</option>
                  <option value="15">每15分钟</option>
                  <option value="60">每小时</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  推荐数量
                </label>
                <select className="input-glass w-full max-w-xs">
                  <option value="5">5个</option>
                  <option value="10">10个</option>
                  <option value="15">15个</option>
                  <option value="20">20个</option>
                </select>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm text-gray-300">启用桌面通知</span>
                </label>
              </div>

              <div>
                <label className="flex items-center space-x-3">
                  <input type="checkbox" className="rounded" defaultChecked />
                  <span className="text-sm text-gray-300">启用声音提醒</span>
                </label>
              </div>

              <div className="pt-4">
                <button className="btn-primary mr-3">保存设置</button>
                <button className="btn-secondary">重置默认</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const getTypeLabel = (type: RecommendationType): string => {
  switch (type) {
    case RecommendationType.CODE_SUGGESTION:
      return '代码建议';
    case RecommendationType.PROJECT_TEMPLATE:
      return '项目模板';
    case RecommendationType.WORKFLOW_RECOMMENDATION:
      return '工作流推荐';
    case RecommendationType.SCRIPT_RECOMMENDATION:
      return '脚本推荐';
    case RecommendationType.BEST_PRACTICE:
      return '最佳实践';
    case RecommendationType.LEARNING_PATH:
      return '学习路径';
    default:
      return '其他推荐';
  }
};

export default RecommendationDashboard;