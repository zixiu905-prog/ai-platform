import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Space,
  Progress,
  Typography,
  Badge,
  Tooltip,
  Divider,
  List,
  Tag,
  Modal,
  message
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { taskManager, Task, TaskStep } from '../services/taskManager';

const { Text, Title } = Typography;

interface TaskControllerProps {
  onTaskUpdate?: (tasks: Task[]) => void;
}

const TaskController: React.FC<TaskControllerProps> = ({ onTaskUpdate }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | undefined>();
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [stepDetailsVisible, setStepDetailsVisible] = useState(false);

  // 初始化事件监听
  useEffect(() => {
    const updateTasks = () => {
      const currentTasks = taskManager.getAllTasks();
      setTasks(currentTasks);
      setActiveTask(taskManager.getActiveTask());
      onTaskUpdate?.(currentTasks);
    };

    // 初始加载
    updateTasks();

    // 事件监听
    const listeners = [
      'task-created',
      'task-started',
      'task-paused',
      'task-resumed',
      'task-completed',
      'task-failed',
      'task-cancelled',
      'task-progress-updated',
      'tasks-updated'
    ];

    listeners.forEach(event => {
      taskManager.on(event, updateTasks);
    });

    return () => {
      listeners.forEach(event => {
        taskManager.off(event, updateTasks);
      });
    };
  }, [onTaskUpdate]);

  // 任务控制操作
  const handleStartTask = async (taskId: string) => {
    setLoading(true);
    try {
      const success = await taskManager.startTask(taskId);
      if (success) {
        message.success('任务启动成功');
      } else {
        message.error('任务启动失败');
      }
    } catch (error) {
      message.error('任务执行出错');
    } finally {
      setLoading(false);
    }
  };

  const handlePauseTask = (taskId: string) => {
    const success = taskManager.pauseTask(taskId);
    if (success) {
      message.success('任务已暂停');
    } else {
      message.error('任务暂停失败');
    }
  };

  const handleResumeTask = async (taskId: string) => {
    setLoading(true);
    try {
      const success = await taskManager.resumeTask(taskId);
      if (success) {
        message.success('任务已恢复');
      } else {
        message.error('任务恢复失败');
      }
    } catch (error) {
      message.error('任务恢复出错');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTask = (taskId: string) => {
    Modal.confirm({
      title: '确认取消任务',
      content: '取消任务后将无法恢复，确定要取消吗？',
      okText: '确认取消',
      cancelText: '继续执行',
      okType: 'danger',
      onOk: () => {
        const success = taskManager.cancelTask(taskId);
        if (success) {
          message.success('任务已取消');
        } else {
          message.error('任务取消失败');
        }
      }
    });
  };

  // 查看任务详情
  const showTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setStepDetailsVisible(true);
  };

  // 获取任务状态图标
  const getTaskStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'running':
        return <LoadingOutlined style={{ color: '#1890ff' }} />;
      case 'paused':
        return <PauseCircleOutlined style={{ color: '#faad14' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#8c8c8c' }} />;
    }
  };

  // 获取任务状态颜色
  const getTaskStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return '#faad14';
      case 'running':
        return '#1890ff';
      case 'paused':
        return '#faad14';
      case 'completed':
        return '#52c41a';
      case 'failed':
        return '#ff4d4f';
      default:
        return '#8c8c8c';
    }
  };

  // 渲染任务操作按钮
  const renderTaskActions = (task: Task) => {
    switch (task.status) {
      case 'pending':
        return (
          <Button
            type="primary"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => handleStartTask(task.id)}
            loading={loading && activeTask?.id === task.id}
          >
            开始
          </Button>
        );
      case 'running':
        return (
          <Space>
            <Button
              type="default"
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handlePauseTask(task.id)}
            >
              暂停
            </Button>
            <Button
              type="default"
              size="small"
              icon={<StopOutlined />}
              danger
              onClick={() => handleCancelTask(task.id)}
            >
              取消
            </Button>
          </Space>
        );
      case 'paused':
        return (
          <Space>
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleResumeTask(task.id)}
              loading={loading && activeTask?.id === task.id}
            >
              继续
            </Button>
            <Button
              type="default"
              size="small"
              icon={<StopOutlined />}
              danger
              onClick={() => handleCancelTask(task.id)}
            >
              取消
            </Button>
          </Space>
        );
      default:
        return null;
    }
  };

  // 渲染任务步骤详情
  const renderTaskSteps = (steps: TaskStep[]) => {
    return (
      <List
        size="small"
        dataSource={steps}
        renderItem={(step, index) => (
          <List.Item>
            <List.Item.Meta
              avatar={
                step.status === 'completed' ? 
                  <CheckCircleOutlined style={{ color: '#52c41a' }} /> :
                  step.status === 'running' ? 
                  <LoadingOutlined style={{ color: '#1890ff' }} /> :
                  step.status === 'failed' ? 
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} /> :
                  <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
              }
              title={
                <Space>
                  <Text strong>步骤 {index + 1}: {step.name}</Text>
                  <Tag color={getTaskStatusColor(step.status)}>
                    {step.status}
                  </Tag>
                </Space>
              }
              description={
                <div>
                  <Progress
                    percent={Math.round(step.progress)}
                    size="small"
                    style={{ marginBottom: '8px' }}
                  />
                  {step.details && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {typeof step.details === 'string' ? step.details : JSON.stringify(step.details)}
                    </Text>
                  )}
                  {step.startTime && (
                    <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                      开始时间: {new Date(step.startTime).toLocaleString()}
                    </Text>
                  )}
                </div>
              }
            />
          </List.Item>
        )}
      />
    );
  };

  return (
    <div style={{ padding: '16px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 当前活动任务 */}
        {activeTask && (
          <Card 
            title={
              <Space>
                <Badge 
                  color={getTaskStatusColor(activeTask.status)} 
                  text="活动任务"
                />
                {getTaskStatusIcon(activeTask.status)}
              </Space>
            }
            size="small"
            extra={renderTaskActions(activeTask)}
          >
            <div>
              <Title level={5}>{activeTask.name}</Title>
              <Text type="secondary">{activeTask.description}</Text>
              
              <div style={{ marginTop: '16px' }}>
                <Progress
                  percent={Math.round(activeTask.progress)}
                  status={activeTask.status === 'failed' ? 'exception' : 'active'}
                  strokeColor={getTaskStatusColor(activeTask.status)}
                />
              </div>
              
              <div style={{ marginTop: '12px' }}>
                <Space split={<Divider type="vertical" />}>
                  <Text>类型: {activeTask.type}</Text>
                  <Text>软件: {activeTask.software || '通用'}</Text>
                  <Text>进度: {Math.round(activeTask.progress)}%</Text>
                </Space>
              </div>

              {activeTask.steps && activeTask.steps.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Button
                    type="link"
                    size="small"
                    icon={<InfoCircleOutlined />}
                    onClick={() => showTaskDetails(activeTask)}
                  >
                    查看详细步骤
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* 任务列表 */}
        <Card 
          title={`任务列表 (${tasks.length})`}
          size="small"
        >
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Text type="secondary">暂无任务</Text>
            </div>
          ) : (
            <List
              size="small"
              dataSource={tasks}
              renderItem={(task) => (
                <List.Item
                  actions={[renderTaskActions(task)]}
                >
                  <List.Item.Meta
                    avatar={getTaskStatusIcon(task.status)}
                    title={
                      <Space>
                        <Text strong={task === activeTask}>
                          {task.name}
                        </Text>
                        {task === activeTask && (
                          <Badge color="blue" text="当前" />
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Space split={<Divider type="vertical" />}>
                          <Text type="secondary">{task.type}</Text>
                          <Text type="secondary">{task.software || '通用'}</Text>
                          <Text>{Math.round(task.progress)}%</Text>
                        </Space>
                        
                        <Progress
                          percent={Math.round(task.progress)}
                          size="small"
                          strokeColor={getTaskStatusColor(task.status)}
                          style={{ marginTop: '8px' }}
                        />
                        
                        <Text type="secondary" style={{ fontSize: '11px' }}>
                          开始时间: {new Date(task.startTime).toLocaleString()}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </Space>

      {/* 任务详情模态框 */}
      <Modal
        title="任务详情"
        open={stepDetailsVisible}
        onCancel={() => setStepDetailsVisible(false)}
        footer={null}
        width={600}
      >
        {selectedTask && (
          <div>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Title level={5}>{selectedTask.name}</Title>
                <Text type="secondary">{selectedTask.description}</Text>
              </div>
              
              <div>
                <Space>
                  <Text strong>状态:</Text>
                  <Badge 
                    color={getTaskStatusColor(selectedTask.status)} 
                    text={selectedTask.status}
                  />
                  <Text strong>进度:</Text>
                  <Text>{Math.round(selectedTask.progress)}%</Text>
                </Space>
              </div>

              {selectedTask.steps && selectedTask.steps.length > 0 && (
                <div>
                  <Title level={5}>执行步骤</Title>
                  {renderTaskSteps(selectedTask.steps)}
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TaskController;