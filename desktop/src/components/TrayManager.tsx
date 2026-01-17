import React, { useEffect, useState } from 'react';
import {
  Card,
  Badge,
  Progress,
  Space,
  Typography,
  List,
  Button,
  Switch,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  Divider,
  Tag,
  Tooltip
} from 'antd';
import {
  DesktopOutlined,
  BellOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import { trayService, TrayShortcut, TrayNotification, TrayStatus } from '../services/trayService';
import './TrayManager.css';

const { Title, Text } = Typography;
const { Option } = Select;

const TrayManager: React.FC = () => {
  const [status, setStatus] = useState<TrayStatus | null>(null);
  const [shortcuts, setShortcuts] = useState<TrayShortcut[]>([]);
  const [notifications, setNotifications] = useState<TrayNotification[]>([]);
  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [showTestModal, setShowTestModal] = useState(false);
  const [shortcutForm] = Form.useForm();

  useEffect(() => {
    // 监听托盘服务事件
    const handleStatusChanged = (newStatus: TrayStatus) => {
      setStatus(newStatus);
    };

    const handleNotification = (notification: TrayNotification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // 只保留最近50个
    };

    const handleProgressChanged = (progress: number) => {
      console.log('进度更新:', progress);
    };

    // 注册事件监听器
    trayService.on('status-changed', handleStatusChanged);
    trayService.on('notification', handleNotification);
    trayService.on('progress-changed', handleProgressChanged);

    // 获取初始数据
    const currentStatus = trayService.getStatus();
    const currentShortcuts = trayService.getShortcuts();
    const currentNotifications = trayService.getNotifications();

    setStatus(currentStatus);
    setShortcuts(currentShortcuts);
    setNotifications(currentNotifications);

    // 清理函数
    return () => {
      trayService.off('status-changed', handleStatusChanged);
      trayService.off('notification', handleNotification);
      trayService.off('progress-changed', handleProgressChanged);
    };
  }, []);

  const handleAddShortcut = (values: any) => {
    const newShortcut: TrayShortcut = {
      id: `shortcut_${Date.now()}`,
      label: values.label,
      accelerator: values.accelerator,
      action: () => {
        console.log('执行快捷操作:', values.label);
        trayService.showNotification({
          id: `action_${Date.now()}`,
          title: '快捷操作',
          body: `执行了: ${values.label}`,
          timeout: 3000
        });
      },
      enabled: values.enabled !== false
    };

    trayService.addShortcut(newShortcut);
    setShortcuts(trayService.getShortcuts());
    setShowAddShortcut(false);
    shortcutForm.resetFields();
  };

  const handleRemoveShortcut = (id: string) => {
    trayService.removeShortcut(id);
    setShortcuts(trayService.getShortcuts());
  };

  const handleStatusChange = (type: string, message: string) => {
    trayService.setStatus({ type: type as any, message });
  };

  const handleProgressChange = (value: number) => {
    trayService.setProgress(value);
  };

  const handleTestNotification = () => {
    trayService.showNotification({
      id: `test_${Date.now()}`,
      title: '测试通知',
      body: '这是一个测试通知，用于验证托盘通知功能是否正常工作。',
      actions: [
        {
          id: 'ok',
          text: '确定',
          action: () => console.log('用户点击了确定')
        }
      ],
      timeout: 5000
    });
    setShowTestModal(false);
  };

  const getStatusColor = (type?: string) => {
    switch (type) {
      case 'working':
        return 'processing';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (type?: string) => {
    switch (type) {
      case 'working':
        return <PlayCircleOutlined />;
      case 'success':
        return <DesktopOutlined />;
      case 'error':
        return <DeleteOutlined />;
      case 'warning':
        return <BellOutlined />;
      default:
        return <DesktopOutlined />;
    }
  };

  return (
    <div className="tray-manager">
      <div className="tray-header">
        <Title level={2}>
          <DesktopOutlined /> 系统托盘管理
        </Title>
        <Text type="secondary">
          管理系统托盘快捷操作、状态显示和通知设置
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* 状态显示 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <DesktopOutlined />
                <span>当前状态</span>
                <Badge status={getStatusColor(status?.type)} />
              </Space>
            }
            extra={
              <Button
                icon={<SettingOutlined />}
                onClick={() => setShowTestModal(true)}
              >
                测试功能
              </Button>
            }
          >
            {status && (
              <div className="status-info">
                <div className="status-main">
                  <Space size="large">
                    <div>
                      <Text type="secondary">状态类型</Text>
                      <div>
                        <Tag color={getStatusColor(status.type)} icon={getStatusIcon(status.type)}>
                          {status.type.toUpperCase()}
                        </Tag>
                      </div>
                    </div>
                    <div>
                      <Text type="secondary">状态消息</Text>
                      <div className="status-message">{status.message}</div>
                    </div>
                    {status.progress !== undefined && (
                      <div style={{ minWidth: 120 }}>
                        <Text type="secondary">进度</Text>
                        <Progress
                          percent={Math.round(status.progress)}
                          size="small"
                          status={status.progress === 100 ? 'success' : 'active'}
                        />
                      </div>
                    )}
                  </Space>
                </div>

                <Divider />

                <div className="status-controls">
                  <Space wrap>
                    <Button
                      size="small"
                      onClick={() => handleStatusChange('idle', 'AiDesign')}
                    >
                      空闲
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleStatusChange('working', '正在处理任务')}
                    >
                      工作中
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleStatusChange('success', '任务完成')}
                    >
                      成功
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleStatusChange('error', '发生错误')}
                    >
                      错误
                    </Button>
                    <Button
                      size="small"
                      onClick={() => handleStatusChange('warning', '警告信息')}
                    >
                      警告
                    </Button>
                  </Space>
                </div>

                <Divider />

                <div className="progress-control">
                  <Text type="secondary">进度控制</Text>
                  <InputNumber
                    min={0}
                    max={100}
                    value={status.progress || 0}
                    onChange={handleProgressChange}
                    formatter={value => `${value}%`}
                    parser={value => value!.replace('%', '')}
                    style={{ width: '100%', marginTop: 8 }}
                  />
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* 快捷操作 */}
        <Col xs={24} lg={12}>
          <Card
            title={
              <Space>
                <ThunderboltOutlined />
                <span>快捷操作</span>
                <Badge count={shortcuts.length} />
              </Space>
            }
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setShowAddShortcut(true)}
              >
                添加
              </Button>
            }
          >
            <List
              dataSource={shortcuts}
              renderItem={(shortcut) => (
                <List.Item
                  actions={[
                    <Switch
                      size="small"
                      checked={shortcut.enabled !== false}
                      onChange={(checked) => {
                        const updatedShortcut = { ...shortcut, enabled: checked };
                        trayService.removeShortcut(shortcut.id);
                        trayService.addShortcut(updatedShortcut);
                        setShortcuts(trayService.getShortcuts());
                      }}
                    />,
                    <Button
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => handleRemoveShortcut(shortcut.id)}
                      danger
                    />
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{shortcut.label}</span>
                        {!shortcut.enabled && <Tag color="default">已禁用</Tag>}
                      </Space>
                    }
                    description={shortcut.accelerator}
                  />
                </List.Item>
              )}
              locale={{
                emptyText: '暂无快捷操作'
              }}
            />
          </Card>
        </Col>

        {/* 通知历史 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <BellOutlined />
                <span>通知历史</span>
                <Badge count={notifications.length} />
              </Space>
            }
            extra={
              <Space>
                <Switch
                  checked={notificationEnabled}
                  onChange={setNotificationEnabled}
                  size="small"
                />
                <Text type="secondary">启用通知</Text>
              </Space>
            }
          >
            <List
              dataSource={notifications}
              renderItem={(notification) => (
                <List.Item>
                  <List.Item.Meta
                    title={notification.title}
                    description={
                      <div>
                        <div>{notification.body}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(notification.id.split('_')[1]).toLocaleString()}
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
              pagination={{
                pageSize: 10,
                size: 'small'
              }}
              locale={{
                emptyText: '暂无通知记录'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 添加快捷操作模态框 */}
      <Modal
        title="添加快捷操作"
        open={showAddShortcut}
        onCancel={() => setShowAddShortcut(false)}
        onOk={() => shortcutForm.submit()}
      >
        <Form
          form={shortcutForm}
          layout="vertical"
          onFinish={handleAddShortcut}
        >
          <Form.Item
            name="label"
            label="操作名称"
            rules={[{ required: true, message: '请输入操作名称' }]}
          >
            <Input placeholder="例如：打开工作台" />
          </Form.Item>

          <Form.Item
            name="accelerator"
            label="快捷键"
            rules={[{ required: true, message: '请输入快捷键' }]}
          >
            <Input placeholder="例如：CmdOrCtrl+Shift+T" />
          </Form.Item>

          <Form.Item
            name="enabled"
            label="启用状态"
            initialValue={true}
            valuePropName="checked"
          >
            <Switch checkedChildren="启用" unCheckedChildren="禁用" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 测试功能模态框 */}
      <Modal
        title="测试托盘功能"
        open={showTestModal}
        onCancel={() => setShowTestModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowTestModal(false)}>
            取消
          </Button>,
          <Button key="notification" type="primary" onClick={handleTestNotification}>
            发送测试通知
          </Button>
        ]}
      >
        <div>
          <Text>点击下方按钮测试系统托盘的通知功能。</Text>
          <br />
          <br />
          <Text type="secondary">
            这将模拟一个通知消息，验证托盘服务是否正常工作。
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default TrayManager;