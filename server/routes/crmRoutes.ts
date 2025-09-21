
import express from 'express';
import { requireAuth } from '../middleware/authorizationMiddleware';
import { CRMService } from '../services/crmService';

const router = express.Router();
const crmService = new CRMService();

// Customer CRUD
router.get('/customers', requireAuth, async (req, res) => {
  try {
    const customers = await crmService.searchCustomers(req.query);
    res.json(customers);
  } catch (error) {
    console.error('Error listing customers:', error);
    res.status(500).json({ message: 'Failed to retrieve customers' });
  }
});

router.post('/customers', requireAuth, async (req, res) => {
  try {
    const newCustomer = await crmService.createCustomer(req.body);
    res.status(201).json(newCustomer);
  } catch (error) {
    console.error('Error creating customer:', error);
    res.status(500).json({ message: 'Failed to create customer' });
  }
});

router.get('/customers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await crmService.getCustomer(id);
    if (customer) {
      res.json(customer);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    console.error('Error retrieving customer:', error);
    res.status(500).json({ message: 'Failed to retrieve customer' });
  }
});

router.put('/customers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedCustomer = await crmService.updateCustomer(id, req.body);
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error updating customer:', error);
    res.status(500).json({ message: 'Failed to update customer' });
  }
});

router.delete('/customers/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const success = await crmService.deleteCustomer(id);
    if (success) {
      res.status(204).send(); // No Content
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    res.status(500).json({ message: 'Failed to delete customer' });
  }
});

// Customer Intelligence
router.get('/customers/:id/health', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const health = await crmService.updateCustomerHealth({ customerId: id }); // Assuming this also calculates/retrieves
    res.json(health);
  } catch (error) {
    console.error('Error retrieving customer health:', error);
    res.status(500).json({ message: 'Failed to retrieve customer health' });
  }
});

router.post('/customers/:id/health/update', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updatedHealth = await crmService.updateCustomerHealth({ customerId: id, ...req.body });
    res.json(updatedHealth);
  } catch (error) {
    console.error('Error updating customer health:', error);
    res.status(500).json({ message: 'Failed to update customer health' });
  }
});

router.get('/customers/:id/timeline', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const customerWithInteractions = await crmService.getCustomer(id); // getCustomer returns interactions
    if (customerWithInteractions) {
      res.json(customerWithInteractions.interactions);
    } else {
      res.status(404).json({ message: 'Customer not found' });
    }
  } catch (error) {
    console.error('Error retrieving customer timeline:', error);
    res.status(500).json({ message: 'Failed to retrieve customer timeline' });
  }
});

router.post('/customers/:id/activities', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const newInteraction = await crmService.recordInteraction({ customerId: id, ...req.body });
    res.status(201).json(newInteraction);
  } catch (error) {
    console.error('Error recording customer activity:', error);
    res.status(500).json({ message: 'Failed to record customer activity' });
  }
});

// Customer Search, Segmentation, and Team Endpoints
router.post('/customers/search', requireAuth, async (req, res) => {
  try {
    const searchResults = await crmService.searchCustomers(req.body);
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching customers:', error);
    res.status(500).json({ message: 'Failed to search customers' });
  }
});

router.get('/customers/segments/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const segment = await crmService.generateSegment(id); // Assuming generateSegment can also retrieve
    res.json(segment);
  } catch (error) {
    console.error('Error retrieving customer segment:', error);
    res.status(500).json({ message: 'Failed to retrieve customer segment' });
  }
});

router.post('/customers/export', requireAuth, async (req, res) => {
  try {
    // Assuming searchCustomers can take export options or there's a dedicated export method
    const exportData = await crmService.searchCustomers(req.body); // Re-using search for simplicity
    res.json({ message: 'Export initiated', data: exportData.customers }); // Simplified response
  } catch (error) {
    console.error('Error exporting customers:', error);
    res.status(500).json({ message: 'Failed to export customers' });
  }
});

router.put('/customers/:id/assign', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedSalesRep } = req.body;
    const updatedCustomer = await crmService.updateCustomer(id, { assignedSalesRep });
    res.json(updatedCustomer);
  } catch (error) {
    console.error('Error assigning sales rep:', error);
    res.status(500).json({ message: 'Failed to assign sales rep' });
  }
});

router.get('/users/:repId/customers', requireAuth, async (req, res) => {
  try {
    const { repId } = req.params;
    const customers = await crmService.searchCustomers({ filters: { assignedSalesRep: repId } });
    res.json(customers);
  } catch (error) {
    console.error('Error retrieving sales rep customers:', error);
    res.status(500).json({ message: 'Failed to retrieve sales rep customers' });
  }
});

export { router as crmRouter };
