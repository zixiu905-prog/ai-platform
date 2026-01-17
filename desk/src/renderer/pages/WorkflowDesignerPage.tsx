import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WorkflowDesigner } from '../components/WorkflowDesigner';
import { useElectronAPI } from '../contexts/ElectronAPIContext';
import apiService from '../services/apiService';

interface Workflow {
  id: string;
  name: string;
  description?: string;
}

const WorkflowDesignerPage: React.FC = () => {
  const { workflowId, templateId } = useParams<{ workflowId?: string; templateId?: string }>();
  const navigate = useNavigate();
  const electronAPI = useElectronAPI();
  const [isSaving, setIsSaving] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<Workflow | null>(null);

  // 处理工作流保存
  const handleSave = async (workflow: any) => {
    setIsSaving(true);
    try {
      const response = await apiService.post('/api/workflows', workflow);
      if (response.success) {
        setCurrentWorkflow(response.data);
        
        // 如果是新创建的工作流，更新URL
        if (!workflowId) {
          navigate(`/workflows/designer/${response.data.id}`, { replace: true });
        }
        
        // 显示保存成功通知
        if (electronAPI) {
          electronAPI.invoke('show-notification', {
            title: '保存成功',
            body: `工作流 "${workflow.name}" 已保存`,
            type: 'success'
          });
        }
      }
    } catch (error) {
      console.error('保存工作流失败:', error);
      
      if (electronAPI) {
        electronAPI.invoke('show-notification', {
          title: '保存失败',
          body: '工作流保存失败，请检查网络连接',
          type: 'error'
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  // 处理工作流执行
  const handleExecute = async (executedWorkflowId: string) => {
    try {
      // 这里可以添加执行前的确认对话框
      if (electronAPI) {
        const confirmed = await electronAPI.invoke('show-dialog', {
          type: 'question',
          title: '确认执行',
          message: '确定要执行这个工作流吗？',
          buttons: ['取消', '执行']
        });
        
        if (confirmed !== 1) return;
      }

      // 启动执行监控
      navigate(`/workflows/monitor/${executedWorkflowId}`);
    } catch (error) {
      console.error('执行工作流失败:', error);
    }
  };

  return (
    <div className="workflow-designer-page h-screen bg-gray-900 flex flex-col">
      {/* 页面头部 */}
      <div className="glass-panel p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/workflows')}
              className="btn-glass flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>返回</span>
            </button>
            
            <div className="h-6 w-px bg-gray-600"></div>
            
            <div>
              <h1 className="text-xl font-semibold text-white">
                {currentWorkflow?.name || (workflowId ? '编辑工作流' : (templateId ? '从模板创建' : '新建工作流'))}
              </h1>
              {currentWorkflow?.description && (
                <p className="text-sm text-gray-400 mt-1">{currentWorkflow.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isSaving && (
              <div className="flex items-center text-yellow-400 text-sm">
                <div className="loading-spinner w-4 h-4 mr-2"></div>
                保存中...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 工作流设计器 */}
      <div className="flex-1 overflow-hidden">
        <WorkflowDesigner
          workflowId={workflowId}
          templateId={templateId}
          onSave={handleSave}
          onExecute={handleExecute}
        />
      </div>
    </div>
  );
};

export default WorkflowDesignerPage;