import React, { useState, useEffect } from 'react';
import { 
  Badge, 
  Button, 
  Drawer, 
  List, 
  Typography, 
  Space, 
  Card, 
  Empty,
  Tooltip,
  Dropdown,
  Menu
} from 'antd';
import { 
  BellOutlined, 
  CheckOutlined, 
  DeleteOutlined, 
  SettingOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { notificationManager, SystemNotification } from '../services/notificationManager';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const { Title, Text } = Typography;

interface NotificationCenterProps {
  position?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
  showBadge?: boolean;
  maxVisible?: number;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  position = 'topRight',
  showBadge = true,
  maxVisible = 5
}) => {
  const [visible, setVisible] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 加载通知列表
  const loadNotifications = () => {
    const allNotifications = notificationManager.getAllNotifications();
    const unreadCount = notificationManager.getUnreadCount();
    setNotifications(allNotifications);
    setUnreadCount(unreadCount);
  };

  // 监听通知事件
  useEffect(() => {
    loadNotifications();
    notificationManager.setupMainProcessListeners();

    const handleNotification = () => loadNotifications();
    const handleNotificationRead = () => loadNotifications();
    const handleNotificationRemoved = () => loadNotifications();
    const handleAllNotificationsRead = () => loadNotifications();
    const handleAllNotificationsCleared = () => loadNotifications();

    notificationManager.on('notification', handleNotification);
    notificationManager.on('notificationRead', handleNotificationRead);
    notificationManager.on('notificationRemoved', handleNotificationRemoved);
    notificationManager.on('allNotificationsRead', handleAllNotificationsRead);
    notificationManager.on('allNotificationsCleared', handleAllNotificationsCleared);

    return () => {
      notificationManager.removeListener('notification', handleNotification);
      notificationManager.removeListener('notificationRead', handleNotificationRead);
      notificationManager.removeListener('notificationRemoved', handleNotificationRemoved);
      notificationManager.removeAllListeners('allNotificationsRead');
      notificationManager.removeAllListeners('allNotificationsCleared');
    };
  }, []);

  const handleMarkAsRead = (id: string) => {
    notificationManager.markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    notificationManager.markAllAsRead();
  };

  const handleRemoveNotification = (id: string) => {
    notificationManager.removeNotification(id);
  };

  const handleClearAll = () => {
    notificationManager.clearAllNotifications();
    setVisible(false);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      default:
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }
  };

  const formatTimestamp = (date: Date) => {
    try {
      return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
    } catch {
      return date.toLocaleString();
    }
  };

  const dropdownMenu = (
    <Menu
      items={[
        {
          key: 'mark-all-read',
          label: '全部标记为已读',
          icon: <CheckOutlined />,
          onClick: handleMarkAllAsRead,
          disabled: unreadCount === 0
        },
        {
          key: 'clear-all',
          label: '清空所有通知',
          icon: <DeleteOutlined />,
          onClick: handleClearAll,
          disabled: notifications.length === 0
        },
        {
          type: 'divider'
        },
        {
          key: 'settings',
          label: '通知设置',
          icon: <SettingOutlined />,
          onClick: () => {
            // TODO: 打开通知设置
          }
        }
      ]}
    />
  );

  const NotificationItem = ({ notification }: { notification: SystemNotification }) => (
    <List.Item
      key={notification.id}
      className={`notification-item ${!notification.read ? 'unread' : ''}`}
      style={{
        padding: '12px 16px',
        background: !notification.read ? '#f6ffed' : 'transparent',
        borderRadius: 6,
        marginBottom: 8
      }}
      actions={[
        !notification.read && (
          <Tooltip title="标记为已读">
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => handleMarkAsRead(notification.id)}
            />
          </Tooltip>
        ),
        <Tooltip title="删除">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveNotification(notification.id)}
          />
        </Tooltip>
      ]}
    >
      <List.Item.Meta
        avatar={getNotificationIcon(notification.type)}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong={!notification.read}>{notification.title}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatTimestamp(notification.timestamp)}
            </Text>
          </div>
        }
        description={
          <div>
            <Text>{notification.body}</Text>
          </div>
        }
      />
    </List.Item>
  );

  const NotificationContent = () => (
    <div style={{ width: 380, maxWidth: '80vw' }}>
      <Card
        title="通知中心"
        size="small"
        extra={
          <Space>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead}>
                全部已读
              </Button>
            )}
            <Dropdown overlay={dropdownMenu} trigger={['click']}>
              <Button size="small" icon={<SettingOutlined />} />
            </Dropdown>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        {notifications.length === 0 ? (
          <Empty
            description="暂无通知"
            style={{ padding: '40px 20px' }}
          />
        ) : (
          <List
            dataSource={notifications.slice(0, maxVisible)}
            renderItem={NotificationItem}
            style={{ maxHeight: 400, overflowY: 'auto' }}
          />
        )}
        
        {notifications.length > maxVisible && (
          <div style={{ padding: '12px', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
            <Button type="link" size="small">
              查看全部通知 ({notifications.length})
            </Button>
          </div>
        )}
      </Card>
    </div>
  );

  return (
    <div className="notification-center">
      <Tooltip title="通知中心">
        <Badge count={unreadCount} size="small" offset={[-4, 4]}>
          <Button
            type="text"
            icon={<BellOutlined />}
            onClick={() => setVisible(true)}
            style={{ 
              fontSize: 16,
              color: unreadCount > 0 ? '#1890ff' : 'inherit'
            }}
          />
        </Badge>
      </Tooltip>

      <Drawer
        title={null}
        placement={position.includes('Right') ? 'right' : 'left'}
        onClose={() => setVisible(false)}
        open={visible}
        bodyStyle={{ padding: 0 }}
        width={400}
      >
        <NotificationContent />
      </Drawer>
    </div>
  );
};

export default NotificationCenter;