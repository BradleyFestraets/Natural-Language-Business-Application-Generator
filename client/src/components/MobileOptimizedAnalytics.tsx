import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  Brain,
  Search,
  Plus,
  Download,
  RefreshCw,
  Target,
  DollarSign,
  Users,
  Activity,
  AlertTriangle,
  CheckCircle,
  Camera,
  MapPin,
  Phone,
  MessageSquare,
  Calendar,
  Clock,
  Filter,
  Share2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BusinessMetric {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  target: number;
  status: 'on_track' | 'behind' | 'exceeded';
  mobileActions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
  }>;
}

interface MobileOptimizedAnalyticsProps {
  className?: string;
  isOffline?: boolean;
  onCameraCapture?: (data: any) => void;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  onVoiceCommand?: (command: string) => void;
  onMobileAction?: (action: string, data: any) => void;
}

export function MobileOptimizedAnalytics({
  className = '',
  isOffline = false,
  onCameraCapture,
  onLocationUpdate,
  onVoiceCommand,
  onMobileAction
}: MobileOptimizedAnalyticsProps) {
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState<any>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [showOfflineMode, setShowOfflineMode] = useState(isOffline);
  const { toast } = useToast();

  useEffect(() => {
    loadMetrics();
    checkLocationPermission();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/analytics/performance');
      const data = await response.json();
      const enhancedMetrics = (data.metrics || []).map((metric: any) => ({
        ...metric,
        mobileActions: generateMobileActions(metric)
      }));
      setMetrics(enhancedMetrics);
    } catch (error) {
      console.error('Failed to load metrics:', error);
      // Load offline data if available
      setShowOfflineMode(true);
      setMetrics(getOfflineMetrics());
    } finally {
      setIsLoading(false);
    }
  };

  const checkLocationPermission = async () => {
    if ('geolocation' in navigator) {
      navigator.permissions.query({ name: 'geolocation' })
        .then((result) => {
          setLocationPermission(result.state as any);
        });
    }
  };

  const generateMobileActions = (metric: any): BusinessMetric['mobileActions'] => {
    const actions = [];

    switch (metric.name.toLowerCase()) {
      case 'total revenue':
        actions.push(
          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => onMobileAction?.('view_details', metric) },
          { label: 'Share', icon: <Share2 className="h-4 w-4" />, onClick: () => onMobileAction?.('share', metric), variant: 'outline' },
          { label: 'Call Sales', icon: <Phone className="h-4 w-4" />, onClick: () => onMobileAction?.('call_sales', metric), variant: 'outline' }
        );
        break;
      case 'total customers':
        actions.push(
          { label: 'View Customers', icon: <Users className="h-4 w-4" />, onClick: () => onMobileAction?.('view_customers', metric) },
          { label: 'Add Customer', icon: <Plus className="h-4 w-4" />, onClick: () => onMobileAction?.('add_customer', metric), variant: 'primary' },
          { label: 'Export', icon: <Download className="h-4 w-4" />, onClick: () => onMobileAction?.('export', metric), variant: 'outline' }
        );
        break;
      case 'marketing roi':
        actions.push(
          { label: 'Optimize', icon: <Target className="h-4 w-4" />, onClick: () => onMobileAction?.('optimize_campaign', metric) },
          { label: 'View Campaigns', icon: <Eye className="h-4 w-4" />, onClick: () => onMobileAction?.('view_campaigns', metric) },
          { label: 'Schedule', icon: <Calendar className="h-4 w-4" />, onClick: () => onMobileAction?.('schedule_campaign', metric), variant: 'outline' }
        );
        break;
      default:
        actions.push(
          { label: 'Details', icon: <Eye className="h-4 w-4" />, onClick: () => onMobileAction?.('view_details', metric) },
          { label: 'Share', icon: <Share2 className="h-4 w-4" />, onClick: () => onMobileAction?.('share', metric), variant: 'outline' }
        );
    }

    return actions;
  };

  const getOfflineMetrics = (): BusinessMetric[] => {
    return [
      {
        id: 'offline_1',
        name: 'Total Revenue',
        value: 125000,
        change: 16200,
        changePercent: 14.9,
        trend: 'up',
        target: 120000,
        status: 'exceeded',
        mobileActions: [
          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => toast({ title: 'Feature not available offline' }) }
        ]
      },
      {
        id: 'offline_2',
        name: 'Total Customers',
        value: 1250,
        change: 80,
        changePercent: 6.8,
        trend: 'up',
        target: 1200,
        status: 'exceeded',
        mobileActions: [
          { label: 'View Customers', icon: <Users className="h-4 w-4" />, onClick: () => toast({ title: 'Feature not available offline' }) }
        ]
      }
    ];
  };

  const handleQuery = async () => {
    if (!query.trim()) return;

    try {
      const response = await fetch('/api/analytics/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await response.json();
      setQueryResults(data);
    } catch (error) {
      console.error('Failed to process query:', error);
      toast({
        title: 'Query Error',
        description: 'Unable to process your request. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const handleCameraCapture = () => {
    if (onCameraCapture) {
      onCameraCapture({ type: 'receipt', timestamp: new Date() });
    } else {
      toast({
        title: 'Camera not available',
        description: 'Camera integration not configured for this device.'
      });
    }
  };

  const handleLocationShare = () => {
    if (locationPermission === 'granted' && onLocationUpdate) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onLocationUpdate({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          toast({
            title: 'Location shared',
            description: 'Your current location has been shared with the team.'
          });
        },
        (error) => {
          console.error('Location error:', error);
          toast({
            title: 'Location access denied',
            description: 'Please enable location services to share your position.'
          });
        }
      );
    } else {
      toast({
        title: 'Location permission required',
        description: 'Please allow location access to share your position.'
      });
    }
  };

  const handleVoiceCommand = () => {
    setIsVoiceMode(!isVoiceMode);
    if (onVoiceCommand) {
      onVoiceCommand(isVoiceMode ? 'stop_voice' : 'start_voice');
    }
  };

  const getMetricIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'revenue':
      case 'total revenue':
        return <DollarSign className="h-4 w-4" />;
      case 'customers':
      case 'total customers':
        return <Users className="h-4 w-4" />;
      case 'leads':
        return <Target className="h-4 w-4" />;
      case 'conversion':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: BusinessMetric['status']) => {
    switch (status) {
      case 'on_track': return 'text-green-600 bg-green-100';
      case 'behind': return 'text-red-600 bg-red-100';
      case 'exceeded': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: BusinessMetric['trend']) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down': return <TrendingUp className="h-3 w-3 text-red-500 transform rotate-180" />;
      case 'stable': return <Activity className="h-3 w-3 text-gray-500" />;
      default: return <Activity className="h-3 w-3" />;
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile-specific header with offline indicator */}
      <div className="flex items-center justify-between p-4 bg-background border rounded-lg">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Business Intelligence</h2>
          {showOfflineMode && (
            <Badge variant="outline" className="text-xs">
              <EyeOff className="h-3 w-3 mr-1" />
              Offline
            </Badge>
          )}
        </div>

        {/* Mobile-specific quick actions */}
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCameraCapture}
            className="p-2"
          >
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleLocationShare}
            className="p-2"
          >
            <MapPin className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant={isVoiceMode ? "default" : "outline"}
            onClick={handleVoiceCommand}
            className="p-2"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadMetrics}
            className="p-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile-optimized metrics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {metrics.map((metric) => (
          <Card key={metric.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getMetricIcon(metric.name)}
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                </div>
                <Badge className={`${getStatusColor(metric.status)} text-xs`} variant="secondary">
                  <span className="capitalize">{metric.status.replace('_', ' ')}</span>
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-lg font-bold">
                {metric.value.toLocaleString()}
              </div>

              <div className="flex items-center gap-1 text-xs">
                {getTrendIcon(metric.trend)}
                <span className={metric.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {metric.changePercent >= 0 ? '+' : ''}{metric.changePercent.toFixed(1)}%
                </span>
                <span className="text-muted-foreground">vs last period</span>
              </div>

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Target: {metric.target.toLocaleString()}</span>
                <span>{((metric.value / metric.target) * 100).toFixed(0)}%</span>
              </div>

              {/* Mobile-specific actions */}
              {metric.mobileActions && (
                <div className="flex gap-1 mt-2">
                  {metric.mobileActions.slice(0, 2).map((action, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.variant || 'outline'}
                      onClick={action.onClick}
                      className="flex-1 text-xs p-1 h-7"
                    >
                      {action.icon}
                      <span className="ml-1">{action.label}</span>
                    </Button>
                  ))}
                  {metric.mobileActions.length > 2 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMobileAction?.('show_more', metric)}
                      className="px-2"
                    >
                      ...
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mobile-optimized tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-9">
          <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="query" className="text-xs">Query</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue Overview</CardTitle>
              <CardDescription className="text-sm">Real-time revenue analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">$125,000</div>
                  <div className="text-xs text-muted-foreground">Total Revenue</div>
                  <div className="text-xs text-green-600 mt-1">+15.3%</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">1,250</div>
                  <div className="text-xs text-muted-foreground">Customers</div>
                  <div className="text-xs text-blue-600 mt-1">+6.8%</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mobile-specific quick actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => onMobileAction?.('quick_report', 'revenue')}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              Quick Report
            </Button>
            <Button
              variant="outline"
              onClick={() => onMobileAction?.('share_metrics', 'dashboard')}
              className="text-xs"
            >
              <Share2 className="h-3 w-3 mr-1" />
              Share
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="query" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Natural Language Query</CardTitle>
              <CardDescription className="text-sm">Ask questions in plain English</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ask me anything..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
                  className="flex-1 px-3 py-2 text-sm border rounded-md"
                />
                <Button size="sm" onClick={handleQuery}>
                  <Search className="h-3 w-3" />
                </Button>
              </div>

              {queryResults && (
                <div className="bg-muted p-3 rounded text-sm">
                  <h4 className="font-semibold mb-1">Results:</h4>
                  <p>{queryResults.insights?.[0] || 'Analysis complete'}</p>
                </div>
              )}

              {/* Mobile voice input */}
              <div className="flex justify-center">
                <Button
                  variant={isVoiceMode ? "default" : "outline"}
                  size="sm"
                  onClick={handleVoiceCommand}
                  className="text-xs"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {isVoiceMode ? 'Stop Voice' : 'Voice Input'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-600" />
                  AI Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">24</div>
                <p className="text-xs text-muted-foreground">Active insights</p>
                <div className="flex items-center gap-2 text-xs text-green-600 mt-1">
                  <CheckCircle className="h-3 w-3" />
                  <span>Revenue growth opportunity</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4 text-blue-600" />
                  Optimization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">8</div>
                <p className="text-xs text-muted-foreground">Available optimizations</p>
                <div className="flex items-center gap-2 text-xs text-blue-600 mt-1">
                  <span>Sales process enhancement</span>
                </div>
              </CardContent>
            </Card>

            {/* Mobile-specific field team features */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-green-600" />
                  Field Team Tools
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLocationShare}
                    className="text-xs p-2"
                  >
                    <MapPin className="h-3 w-3 mr-1" />
                    Share Location
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCameraCapture}
                    className="text-xs p-2"
                  >
                    <Camera className="h-3 w-3 mr-1" />
                    Capture Receipt
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMobileAction?.('call_support', {})}
                    className="text-xs p-2"
                  >
                    <Phone className="h-3 w-3 mr-1" />
                    Call Support
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onMobileAction?.('schedule_meeting', {})}
                    className="text-xs p-2"
                  >
                    <Calendar className="h-3 w-3 mr-1" />
                    Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Offline mode indicator */}
      {showOfflineMode && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 p-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Offline Mode</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Some features may be limited. Data will sync when online.
          </p>
        </div>
      )}
    </div>
  );
}
