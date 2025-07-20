import React, { useEffect, useState } from 'react';
import { Bell, Settings, Trash2, MessageSquare, CheckCheck, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotificationHistory } from '@/services/notificationHistory';
import { useSmartNotificationFilter } from '@/services/smartNotificationFilter';
import { formatDistanceToNow } from 'date-fns';

export const NotificationCenter = () => {
  const navigate = useNavigate();
  const {
    getHistory,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearHistory,
    getActions
  } = useNotificationHistory();

  const {
    getConfig,
    saveUserFilterConfig,
    getStatus
  } = useSmartNotificationFilter();

  const [notifications, setNotifications] = useState(getHistory());
  const [unreadCount, setUnreadCount] = useState(getUnreadCount());
  const [showSettings, setShowSettings] = useState(false);
  const [filterConfig, setFilterConfig] = useState(getConfig());
  const [filterStatus, setFilterStatus] = useState(getStatus());

  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(getHistory());
      setUnreadCount(getUnreadCount());
      setFilterStatus(getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (notification: any) => {
    markAsRead(notification.id);
    if (notification.deepLinkUrl) {
      navigate(notification.deepLinkUrl);
    }
  };

  const handleActionClick = (action: any) => {
    if (action.action === 'navigate' && action.url) {
      navigate(action.url);
    }
  };

  const updateFilterConfig = async (updates: any) => {
    const newConfig = { ...filterConfig, ...updates };
    setFilterConfig(newConfig);
    await saveUserFilterConfig(updates);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'messages':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'orange';
      case 'normal':
        return 'blue';
      case 'low':
        return 'gray';
      default:
        return 'blue';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount}</Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Smart Filter Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="app-activity">App Activity Detection</Label>
                  <Switch
                    id="app-activity"
                    checked={filterConfig.enableAppActivityDetection}
                    onCheckedChange={(checked) =>
                      updateFilterConfig({ enableAppActivityDetection: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="quiet-hours">Quiet Hours</Label>
                  <Switch
                    id="quiet-hours"
                    checked={filterConfig.enableQuietHours}
                    onCheckedChange={(checked) =>
                      updateFilterConfig({ enableQuietHours: checked })
                    }
                  />
                </div>

                {filterConfig.enableQuietHours && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="quiet-start">Start Time</Label>
                      <Input
                        id="quiet-start"
                        type="time"
                        value={filterConfig.quietHoursStart}
                        onChange={(e) =>
                          updateFilterConfig({ quietHoursStart: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="quiet-end">End Time</Label>
                      <Input
                        id="quiet-end"
                        type="time"
                        value={filterConfig.quietHoursEnd}
                        onChange={(e) =>
                          updateFilterConfig({ quietHoursEnd: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="critical-override">Allow Critical During Quiet Hours</Label>
                  <Switch
                    id="critical-override"
                    checked={filterConfig.allowCriticalDuringQuietHours}
                    onCheckedChange={(checked) =>
                      updateFilterConfig({ allowCriticalDuringQuietHours: checked })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Current Status</h4>
                <div className="text-sm space-y-1">
                  <div>App Visible: {filterStatus.isAppVisible ? '✅' : '❌'}</div>
                  <div>App Active: {filterStatus.isAppActive ? '✅' : '❌'}</div>
                  <div>Quiet Hours: {filterStatus.isInQuietHours ? '🔕' : '🔔'}</div>
                  <div>Last Activity: {formatDistanceToNow(filterStatus.lastActivity)} ago</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No notifications yet</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Recent Notifications</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            </div>

            {notifications.map((notification) => (
              <Card
                key={notification.id}
                className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                  !notification.read ? 'border-primary' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{notification.title}</h3>
                          <Badge variant={getPriorityColor(notification.priority) as any}>
                            {notification.priority}
                          </Badge>
                          {!notification.read && (
                            <div className="h-2 w-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.body}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.timestamp)} ago
                          </span>
                          <div className="flex gap-2">
                            {getActions(notification).map((action) => (
                              <Button
                                key={action.id}
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleActionClick(action);
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
};