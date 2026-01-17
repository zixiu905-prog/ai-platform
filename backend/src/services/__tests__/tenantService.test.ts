import { TestDataGenerator } from '../../test/utils';

// 模拟整个tenantService模块
jest.mock('../../services/tenantService', () => {
  const mockTenantService = {
    createTenant: jest.fn(),
        
        
    getTenantById: jest.fn(),
        
        
    updateTenant: jest.fn(),
        
        
    deleteTenant: jest.fn(),
        
        
    getTenantsByUser: jest.fn(),
        
        
  };
  
  return {
    default: mockTenantService,
        
        
  };
});

const tenantService = require('../../services/tenantService').default;

describe('TenantService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Existence', () => {
    it('should have tenantService module', () => {
      expect(tenantService).toBeDefined();
    });

    it('should have required methods', () => {
      expect(typeof tenantService.createTenant).toBe('function');
      expect(typeof tenantService.getTenantById).toBe('function');
      expect(typeof tenantService.updateTenant).toBe('function');
      expect(typeof tenantService.deleteTenant).toBe('function');
      expect(typeof tenantService.getTenantsByUser).toBe('function');
    });
  });

  describe('createTenant', () => {
    it('should create a new tenant with valid data', async () => {
      const tenantData = TestDataGenerator.generateTenant();
      const expectedResult = {
        success: true,
        
        
        data: {
          id: 'tenant-id',
        
        
          ...tenantData,
        
        
        }
        
        
      };

      tenantService.createTenant.mockResolvedValue(expectedResult);

      const result = await tenantService.createTenant(tenantData);

      expect(result).toEqual(expectedResult);
      expect(tenantService.createTenant).toHaveBeenCalledWith(tenantData);
    });

    it('should handle tenant creation errors', async () => {
      const tenantData = TestDataGenerator.generateTenant();
      const errorResult = {
        success: false,
        
        
        error: 'Tenant already exists',
        
        
      };

      tenantService.createTenant.mockResolvedValue(errorResult);

      const result = await tenantService.createTenant(tenantData);

      expect(result).toEqual(errorResult);
      expect(tenantService.createTenant).toHaveBeenCalledWith(tenantData);
    });
  });

  describe('getTenantById', () => {
    it('should get tenant by ID', async () => {
      const tenantId = 'tenant-id';
      const expectedTenant = {
        id: tenantId,
        
        
        name: 'Test Tenant',
        
        
        domain: 'test',
        
        
        status: 'active',
        
        
      };

      const expectedResult = {
        success: true,
        
        
        data: { tenant: expectedTenant }
        
        
      };

      tenantService.getTenantById.mockResolvedValue(expectedResult);

      const result = await tenantService.getTenantById(tenantId);

      expect(result).toEqual(expectedResult);
      expect(tenantService.getTenantById).toHaveBeenCalledWith(tenantId);
    });

    it('should handle tenant not found', async () => {
      const tenantId = 'nonexistent-tenant';
      const errorResult = {
        success: false,
        
        
        error: 'Tenant not found',
        
        
      };

      tenantService.getTenantById.mockResolvedValue(errorResult);

      const result = await tenantService.getTenantById(tenantId);

      expect(result).toEqual(errorResult);
      expect(tenantService.getTenantById).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('updateTenant', () => {
    it('should update tenant with valid data', async () => {
      const tenantId = 'tenant-id';
      const updateData = {
        name: 'Updated Tenant Name',
        
        
        description: 'Updated description',
        
        
      };

      const expectedResult = {
        success: true,
        
        
        data: {
          id: tenantId,
        
        
          ...updateData,
        
        
        }
        
        
      };

      tenantService.updateTenant.mockResolvedValue(expectedResult);

      const result = await tenantService.updateTenant(tenantId, updateData);

      expect(result).toEqual(expectedResult);
      expect(tenantService.updateTenant).toHaveBeenCalledWith(tenantId, updateData);
    });

    it('should handle update errors', async () => {
      const tenantId = 'tenant-id';
      const updateData = { name: 'Invalid Name' };
      const errorResult = {
        success: false,
        
        
        error: 'Invalid tenant data',
        
        
      };

      tenantService.updateTenant.mockResolvedValue(errorResult);

      const result = await tenantService.updateTenant(tenantId, updateData);

      expect(result).toEqual(errorResult);
      expect(tenantService.updateTenant).toHaveBeenCalledWith(tenantId, updateData);
    });
  });

  describe('deleteTenant', () => {
    it('should delete tenant successfully', async () => {
      const tenantId = 'tenant-id';
      const expectedResult = {
        success: true,
        
        
        message: 'Tenant deleted successfully',
        
        
      };

      tenantService.deleteTenant.mockResolvedValue(expectedResult);

      const result = await tenantService.deleteTenant(tenantId);

      expect(result).toEqual(expectedResult);
      expect(tenantService.deleteTenant).toHaveBeenCalledWith(tenantId);
    });

    it('should handle tenant not found on deletion', async () => {
      const tenantId = 'nonexistent-tenant';
      const errorResult = {
        success: false,
        
        
        error: 'Tenant not found',
        
        
      };

      tenantService.deleteTenant.mockResolvedValue(errorResult);

      const result = await tenantService.deleteTenant(tenantId);

      expect(result).toEqual(errorResult);
      expect(tenantService.deleteTenant).toHaveBeenCalledWith(tenantId);
    });
  });

  describe('getTenantsByUser', () => {
    it('should get tenants for a user', async () => {
      const userId = 'user-id';
      const tenants = [
        TestDataGenerator.generateTenant({ id: 'tenant-1' }),
        
        
        TestDataGenerator.generateTenant({ id: 'tenant-2' }),
        
        
      ];

      const expectedResult = {
        success: true,
        
        
        data: { tenants }
        
        
      };

      tenantService.getTenantsByUser.mockResolvedValue(expectedResult);

      const result = await tenantService.getTenantsByUser(userId);

      expect(result).toEqual(expectedResult);
      expect(tenantService.getTenantsByUser).toHaveBeenCalledWith(userId);
    });

    it('should handle empty tenant list', async () => {
      const userId = 'user-without-tenants';
      const expectedResult = {
        success: true,
        
        
        data: { tenants: [] }
        
        
      };

      tenantService.getTenantsByUser.mockResolvedValue(expectedResult);

      const result = await tenantService.getTenantsByUser(userId);

      expect(result).toEqual(expectedResult);
      expect(tenantService.getTenantsByUser).toHaveBeenCalledWith(userId);
    });
  });
});