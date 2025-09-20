import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Users,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Camera,
  Share2,
  MoreVertical,
  Star,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  User,
  RefreshCw,
  Eye,
  Edit,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  status: 'lead' | 'prospect' | 'customer' | 'churned';
  healthScore: number;
  lastActivity: Date;
  value: number;
  avatar?: string;
  location?: string;
  tags: string[];
  mobileActions?: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    color?: 'green' | 'blue' | 'orange' | 'red';
  }>;
}

interface MobileOptimizedCRMProps {
  className?: string;
  isOffline?: boolean;
  onCameraCapture?: (data: any) => void;
  onLocationUpdate?: (location: { lat: number; lng: number }) => void;
  onVoiceCommand?: (command: string) => void;
  onMobileAction?: (action: string, data: any) => void;
}

export function MobileOptimizedCRM({
  className = '',
  isOffline = false,
  onCameraCapture,
  onLocationUpdate,
  onVoiceCommand,
  onMobileAction
}: MobileOptimizedCRMProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(false);
  const [showOfflineMode, setShowOfflineMode] = useState(isOffline);
  const { toast } = useToast();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/crm/customers/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filters: { status: selectedFilter !== 'all' ? [selectedFilter] : undefined }
        })
      });
      const data = await response.json();
      const enhancedCustomers = (data.customers || []).map((customer: any) => ({
        ...customer,
        mobileActions: generateMobileActions(customer)
      }));
      setCustomers(enhancedCustomers);
    } catch (error) {
      console.error('Failed to load customers:', error);
      setShowOfflineMode(true);
      setCustomers(getOfflineCustomers());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMobileActions = (customer: any): Customer['mobileActions'] => {
    const actions = [];

    switch (customer.status) {
      case 'lead':
        actions.push(
          { label: 'Qualify', icon: <CheckCircle className="h-4 w-4" />, onClick: () => onMobileAction?.('qualify_lead', customer), variant: 'primary', color: 'green' },
          { label: 'Call', icon: <Phone className="h-4 w-4" />, onClick: () => onMobileAction?.('call_customer', customer), variant: 'outline', color: 'blue' },
          { label: 'Email', icon: <Mail className="h-4 w-4" />, onClick: () => onMobileAction?.('email_customer', customer), variant: 'outline', color: 'blue' }
        );
        break;
      case 'customer':
        actions.push(
          { label: 'View Details', icon: <Eye className="h-4 w-4" />, onClick: () => onMobileAction?.('view_customer', customer) },
          { label: 'Schedule Meeting', icon: <Calendar className="h-4 w-4" />, onClick: () => onMobileAction?.('schedule_meeting', customer), variant: 'outline', color: 'orange' },
          { label: 'Create Quote', icon: <Plus className="h-4 w-4" />, onClick: () => onMobileAction?.('create_quote', customer), variant: 'outline', color: 'green' }
        );
        break;
      case 'churned':
        actions.push(
          { label: 'Reactivate', icon: <RefreshCw className="h-4 w-4" />, onClick: () => onMobileAction?.('reactivate_customer', customer), variant: 'primary', color: 'blue' },
          { label: 'View History', icon: <Eye className="h-4 w-4" />, onClick: () => onMobileAction?.('view_history', customer), variant: 'outline' }
        );
        break;
      default:
        actions.push(
          { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => onMobileAction?.('view_customer', customer) },
          { label: 'Edit', icon: <Edit className="h-4 w-4" />, onClick: () => onMobileAction?.('edit_customer', customer), variant: 'outline' }
        );
    }

    return actions;
  };

  const getOfflineCustomers = (): Customer[] => {
    return [
      {
        id: 'offline_1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 (555) 123-4567',
        company: 'Acme Corp',
        status: 'customer',
        healthScore: 85,
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
        value: 25000,
        tags: ['high-value', 'repeat-customer'],
        mobileActions: [
          { label: 'View', icon: <Eye className="h-4 w-4" />, onClick: () => toast({ title: 'Feature not available offline' }) }
        ]
      },
      {
        id: 'offline_2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+1 (555) 987-6543',
        company: 'Tech Solutions Inc',
        status: 'lead',
        healthScore: 72,
        lastActivity: new Date(Date.now() - 5 * 60 * 60 * 1000),
        value: 15000,
        tags: ['enterprise', 'new-lead'],
        mobileActions: [
          { label: 'Qualify', icon: <CheckCircle className="h-4 w-4" />, onClick: () => toast({ title: 'Feature not available offline' }) }
        ]
      }
    ];
  };

  const getStatusColor = (status: Customer['status']) => {
    switch (status) {
      case 'lead': return 'text-blue-600 bg-blue-100';
      case 'prospect': return 'text-orange-600 bg-orange-100';
      case 'customer': return 'text-green-600 bg-green-100';
      case 'churned': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.company?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCameraCapture = () => {
    if (onCameraCapture) {
      onCameraCapture({ type: 'business_card', timestamp: new Date() });
    } else {
      toast({
        title: 'Camera not available',
        description: 'Camera integration not configured for this device.'
      });
    }
  };

  const handleAddCustomer = () => {
    onMobileAction?.('add_customer', {});
  };

  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    loadCustomers();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mobile-specific header */}
      <div className="flex items-center justify-between p-4 bg-background border rounded-lg">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Customer Management</h2>
          {showOfflineMode && (
            <Badge variant="outline" className="text-xs">
              <Eye className="h-3 w-3 mr-1" />
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
            onClick={() => onMobileAction?.('scan_qr', {})}
            className="p-2"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onMobileAction?.('import_contacts', {})}
            className="p-2"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={loadCustomers}
            className="p-2"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search and filter bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMobileAction?.('show_filters', {})}
          className="p-2"
        >
          <Filter className="h-4 w-4" />
        </Button>
        <Button
          onClick={handleAddCustomer}
          className="text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Customer
        </Button>
      </div>

      {/* Status filter tabs */}
      <Tabs value={selectedFilter} onValueChange={handleFilterChange}>
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
          <TabsTrigger value="lead" className="text-xs">Leads</TabsTrigger>
          <TabsTrigger value="customer" className="text-xs">Customers</TabsTrigger>
          <TabsTrigger value="churned" className="text-xs">Churned</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Customer list */}
      <div className="space-y-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm truncate">{customer.name}</CardTitle>
                    <CardDescription className="text-xs truncate">{customer.company || customer.email}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge className={`${getStatusColor(customer.status)} text-xs`} variant="secondary">
                    <span className="capitalize">{customer.status}</span>
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMobileAction?.('show_customer_menu', customer)}
                    className="p-1 h-8 w-8"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${customer.healthScore >= 80 ? 'bg-green-500' : customer.healthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                  <span className={`font-medium ${getHealthScoreColor(customer.healthScore)}`}>
                    {customer.healthScore}% Health
                  </span>
                </div>
                <div className="text-muted-foreground">
                  {customer.value.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  <span>{customer.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{customer.lastActivity.toLocaleDateString()}</span>
                </div>
              </div>

              {/* Tags */}
              {customer.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {customer.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {customer.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{customer.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Mobile-specific actions */}
              {customer.mobileActions && (
                <div className="flex gap-1 mt-3">
                  {customer.mobileActions.slice(0, 2).map((action, index) => (
                    <Button
                      key={index}
                      size="sm"
                      variant={action.variant || 'outline'}
                      onClick={action.onClick}
                      className={`flex-1 text-xs p-1 h-7 ${
                        action.color ? `text-${action.color}-600 border-${action.color}-200 hover:bg-${action.color}-50` : ''
                      }`}
                    >
                      {action.icon}
                      <span className="ml-1">{action.label}</span>
                    </Button>
                  ))}
                  {customer.mobileActions.length > 2 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onMobileAction?.('show_more_actions', customer)}
                      className="px-2"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mobile-specific quick stats */}
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-lg font-bold">{customers.length}</div>
                <div className="text-xs text-muted-foreground">Total Customers</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-lg font-bold">
                  {Math.round(customers.reduce((sum, c) => sum + c.healthScore, 0) / customers.length)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Health Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offline mode indicator */}
      {showOfflineMode && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-300 p-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Offline Mode</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Customer data may be outdated. Sync when online.
          </p>
        </div>
      )}
    </div>
  );
}
