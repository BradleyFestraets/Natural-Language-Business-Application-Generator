
import request from 'supertest';
import express from 'express';
import { crmRouter } from './crmRoutes';
import { CRMService } from '../services/crmService';
import { requireAuth } from '../middleware/authorizationMiddleware';

// Mock the CRMService
jest.mock('../services/crmService');
const mockCrmService = CRMService as jest.MockedClass<typeof CRMService>;

// Mock requireAuth middleware
jest.mock('../middleware/authorizationMiddleware', () => ({
  requireAuth: jest.fn((req, res, next) => next()), // Allow all authenticated requests
}));

const app = express();
app.use(express.json());
app.use('/api/crm', crmRouter);

describe('CRM API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test GET /api/crm/customers
  it('should return a list of customers', async () => {
    const mockCustomers = [{ id: '1', personalInfo: { firstName: 'John' } }];
    mockCrmService.prototype.searchCustomers.mockResolvedValueOnce({ customers: mockCustomers, total: 1, page: 1, totalPages: 1, filters: {} });

    const res = await request(app).get('/api/crm/customers');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ customers: mockCustomers, total: 1, page: 1, totalPages: 1, filters: {} });
    expect(mockCrmService.prototype.searchCustomers).toHaveBeenCalledTimes(1);
  });

  // Test POST /api/crm/customers
  it('should create a new customer', async () => {
    const newCustomerData = { personalInfo: { firstName: 'Jane' } };
    const createdCustomer = { id: '2', ...newCustomerData };
    mockCrmService.prototype.createCustomer.mockResolvedValueOnce(createdCustomer);

    const res = await request(app).post('/api/crm/customers').send(newCustomerData);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(createdCustomer);
    expect(mockCrmService.prototype.createCustomer).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.createCustomer).toHaveBeenCalledWith(newCustomerData);
  });

  // Test GET /api/crm/customers/:id
  it('should return a single customer by ID', async () => {
    const mockCustomer = { id: '1', personalInfo: { firstName: 'John' } };
    mockCrmService.prototype.getCustomer.mockResolvedValueOnce(mockCustomer);

    const res = await request(app).get('/api/crm/customers/1');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockCustomer);
    expect(mockCrmService.prototype.getCustomer).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.getCustomer).toHaveBeenCalledWith('1');
  });

  it('should return 404 if customer not found', async () => {
    mockCrmService.prototype.getCustomer.mockResolvedValueOnce(undefined);

    const res = await request(app).get('/api/crm/customers/999');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'Customer not found' });
  });

  // Test PUT /api/crm/customers/:id
  it('should update an existing customer', async () => {
    const updatedData = { personalInfo: { firstName: 'Johnny' } };
    const updatedCustomer = { id: '1', personalInfo: { firstName: 'Johnny' } };
    mockCrmService.prototype.updateCustomer.mockResolvedValueOnce(updatedCustomer);

    const res = await request(app).put('/api/crm/customers/1').send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(updatedCustomer);
    expect(mockCrmService.prototype.updateCustomer).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.updateCustomer).toHaveBeenCalledWith('1', updatedData);
  });

  // Test DELETE /api/crm/customers/:id
  it('should delete a customer', async () => {
    mockCrmService.prototype.deleteCustomer.mockResolvedValueOnce(true);

    const res = await request(app).delete('/api/crm/customers/1');

    expect(res.statusCode).toEqual(204);
    expect(mockCrmService.prototype.deleteCustomer).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.deleteCustomer).toHaveBeenCalledWith('1');
  });

  it('should return 404 if customer to delete not found', async () => {
    mockCrmService.prototype.deleteCustomer.mockResolvedValueOnce(false);

    const res = await request(app).delete('/api/crm/customers/999');

    expect(res.statusCode).toEqual(404);
    expect(res.body).toEqual({ message: 'Customer not found' });
  });

  // Test GET /api/crm/customers/:id/health
  it('should return customer health', async () => {
    const mockHealth = { customerId: '1', score: 85 };
    mockCrmService.prototype.updateCustomerHealth.mockResolvedValueOnce(mockHealth);

    const res = await request(app).get('/api/crm/customers/1/health');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockHealth);
    expect(mockCrmService.prototype.updateCustomerHealth).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.updateCustomerHealth).toHaveBeenCalledWith({ customerId: '1' });
  });

  // Test POST /api/crm/customers/:id/health/update
  it('should update customer health', async () => {
    const updateData = { status: 'good' };
    const updatedHealth = { customerId: '1', score: 90, status: 'good' };
    mockCrmService.prototype.updateCustomerHealth.mockResolvedValueOnce(updatedHealth);

    const res = await request(app).post('/api/crm/customers/1/health/update').send(updateData);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(updatedHealth);
    expect(mockCrmService.prototype.updateCustomerHealth).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.updateCustomerHealth).toHaveBeenCalledWith({ customerId: '1', ...updateData });
  });

  // Test GET /api/crm/customers/:id/timeline
  it('should return customer timeline', async () => {
    const mockTimeline = [{ id: 'int1', type: 'email' }];
    mockCrmService.prototype.getCustomer.mockResolvedValueOnce({ interactions: mockTimeline });

    const res = await request(app).get('/api/crm/customers/1/timeline');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockTimeline);
    expect(mockCrmService.prototype.getCustomer).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.getCustomer).toHaveBeenCalledWith('1');
  });

  // Test POST /api/crm/customers/:id/activities
  it('should record customer activity', async () => {
    const activityData = { type: 'call', description: 'Called customer' };
    const createdActivity = { id: 'act1', ...activityData, customerId: '1' };
    mockCrmService.prototype.recordInteraction.mockResolvedValueOnce(createdActivity);

    const res = await request(app).post('/api/crm/customers/1/activities').send(activityData);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(createdActivity);
    expect(mockCrmService.prototype.recordInteraction).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.recordInteraction).toHaveBeenCalledWith({ customerId: '1', ...activityData });
  });

  // Test POST /api/crm/customers/search
  it('should search customers', async () => {
    const searchCriteria = { query: 'John', filters: {} };
    const mockSearchResults = { customers: [{ id: '1' }], total: 1, page: 1, totalPages: 1, filters: {} };
    mockCrmService.prototype.searchCustomers.mockResolvedValueOnce(mockSearchResults);

    const res = await request(app).post('/api/crm/customers/search').send(searchCriteria);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockSearchResults);
    expect(mockCrmService.prototype.searchCustomers).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.searchCustomers).toHaveBeenCalledWith(searchCriteria);
  });

  // Test GET /api/crm/customers/segments/:id
  it('should return customer segment', async () => {
    const mockSegment = { id: 'seg1', name: 'High Value', customers: ['1'] };
    mockCrmService.prototype.generateSegment.mockResolvedValueOnce(mockSegment);

    const res = await request(app).get('/api/crm/customers/segments/seg1');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(mockSegment);
    expect(mockCrmService.prototype.generateSegment).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.generateSegment).toHaveBeenCalledWith('seg1');
  });

  // Test POST /api/crm/customers/export
  it('should export customers', async () => {
    const exportOptions = { format: 'csv' };
    const mockExportData = { customers: [{ id: '1' }] };
    mockCrmService.prototype.searchCustomers.mockResolvedValueOnce(mockExportData);

    const res = await request(app).post('/api/crm/customers/export').send(exportOptions);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ message: 'Export initiated', data: mockExportData.customers });
    expect(mockCrmService.prototype.searchCustomers).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.searchCustomers).toHaveBeenCalledWith(exportOptions);
  });

  // Test PUT /api/crm/customers/:id/assign
  it('should assign a sales rep to a customer', async () => {
    const assignData = { assignedSalesRep: 'rep1' };
    const updatedCustomer = { id: '1', assignedSalesRep: 'rep1' };
    mockCrmService.prototype.updateCustomer.mockResolvedValueOnce(updatedCustomer);

    const res = await request(app).put('/api/crm/customers/1/assign').send(assignData);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(updatedCustomer);
    expect(mockCrmService.prototype.updateCustomer).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.updateCustomer).toHaveBeenCalledWith('1', assignData);
  });

  // Test GET /api/crm/users/:repId/customers
  it('should return customers assigned to a sales rep', async () => {
    const mockCustomers = [{ id: '1', assignedSalesRep: 'rep1' }];
    mockCrmService.prototype.searchCustomers.mockResolvedValueOnce({ customers: mockCustomers, total: 1, page: 1, totalPages: 1, filters: {} });

    const res = await request(app).get('/api/crm/users/rep1/customers');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ customers: mockCustomers, total: 1, page: 1, totalPages: 1, filters: {} });
    expect(mockCrmService.prototype.searchCustomers).toHaveBeenCalledTimes(1);
    expect(mockCrmService.prototype.searchCustomers).toHaveBeenCalledWith({ filters: { assignedSalesRep: 'rep1' } });
  });
});
