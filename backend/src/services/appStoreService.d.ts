export interface AppCategory {
    id: string;
    name: string;
    description?: string;
    icon?: string;
    color?: string;
    parentId?: string;
    level: number;
    path: string;
    sortOrder: number;
    isActive: boolean;
    children?: AppCategory[];
}
export interface DesktopApp {
    id: string;
    name: string;
    description: string;
    shortDesc?: string;
    categoryId: string;
    version: string;
    iconUrl?: string;
    screenshots: any;
    downloadUrl: string;
    installSize: number;
    minSystemReq: any;
    maxSystemReq?: any;
    supportedOS: any;
    features: any;
    changelog?: string;
    privacyPolicy?: string;
    termsOfUse?: string;
    price: number;
    currency: string;
    isFree: boolean;
    isActive: boolean;
    isFeatured: boolean;
    downloadCount: number;
    rating: number;
    ratingCount: number;
    reviewCount: number;
    lastVersionUpdate?: Date;
    createdAt: Date;
    updatedAt: Date;
    category?: any;
    versions?: any[];
    reviews?: any[];
    avgRating?: number;
}
export interface AppVersion {
    id: string;
    appId: string;
    version: string;
    versionCode: number;
    changelog?: string;
    downloadUrl: string;
    downloadSize: number;
    minSystemReq: any;
    maxSystemReq?: any;
    supportedOS: any;
    isBeta: boolean;
    isStable: boolean;
    isActive: boolean;
    downloadCount: number;
    releaseDate: Date;
    createdAt: Date;
}
export interface AppReview {
    id: string;
    appId: string;
    userId: string;
    rating: number;
    title?: string;
    content: string;
    isVerified: boolean;
    isHelpful: number;
    createdAt: Date;
    updatedAt: Date;
    user?: any;
}
export interface CreateAppData {
    name: string;
    description: string;
    shortDesc?: string;
    categoryId: string;
    iconUrl?: string;
    screenshots?: any;
    downloadUrl: string;
    installSize: number;
    minSystemReq?: any;
    maxSystemReq?: any;
    supportedOS?: any;
    features?: any;
    changelog?: string;
    privacyPolicy?: string;
    termsOfUse?: string;
    price?: number;
    currency?: string;
    isFree?: boolean;
    isActive?: boolean;
}
export declare class AppStoreService {
    private logNotImplemented;
    getCategoriesTree(): Promise<AppCategory[]>;
    private buildCategoryTree;
    getCategories(_parentId?: string): Promise<AppCategory[]>;
    getCategoryById(_id: string): Promise<AppCategory | null>;
    getApps(_options: {
        page?: number;
        limit?: number;
        categoryId?: string;
        search?: string;
        featured?: boolean;
        free?: boolean;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }): Promise<{
        apps: DesktopApp[];
        total: number;
    }>;
    getAppById(_id: string): Promise<DesktopApp | null>;
    createApp(_data: CreateAppData, _userId: string): Promise<DesktopApp>;
    updateApp(_id: string, _data: Partial<CreateAppData>): Promise<DesktopApp>;
    deleteApp(_id: string): Promise<void>;
    addVersion(_appId: string, _data: Partial<AppVersion>): Promise<AppVersion>;
    getVersions(_appId: string): Promise<AppVersion[]>;
    addReview(_appId: string, _userId: string, _data: {
        rating: number;
        title?: string;
        content: string;
    }): Promise<AppReview>;
    getReviews(_appId: string): Promise<AppReview[]>;
    recordDownload(_appId: string, _userId: string): Promise<void>;
    favoriteApp(_appId: string, _userId: string): Promise<void>;
    unfavoriteApp(_appId: string, _userId: string): Promise<void>;
    getFavorites(_userId: string): Promise<DesktopApp[]>;
    getPopularApps(_limit?: number): Promise<DesktopApp[]>;
    getFeaturedApps(_limit?: number): Promise<DesktopApp[]>;
    searchApps(_query: string, _options?: {
        page?: number;
        limit?: number;
        categoryId?: string;
    }): Promise<{
        apps: DesktopApp[];
        total: number;
    }>;
    updateAppStats(_appId: string): Promise<void>;
    createCategory(_data: {
        name: string;
        description?: string;
        icon?: string;
        color?: string;
        parentId?: string;
        sortOrder?: number;
    }): Promise<AppCategory>;
    getLatestApps(_limit?: number): Promise<DesktopApp[]>;
    installApp(_appId: string, _userId: string): Promise<void>;
    toggleFavorite(_appId: string, _userId: string): Promise<boolean>;
    getUserFavorites: (_userId: string) => Promise<DesktopApp[]>;
    addAppReview: (_appId: string, _userId: string, _data: {
        rating: number;
        title?: string;
        content: string;
    }) => Promise<AppReview>;
    getAppStats(_appId: string): Promise<any>;
    addAppVersion: (_appId: string, _data: Partial<AppVersion>) => Promise<AppVersion>;
}
export declare const appStoreService: AppStoreService;
//# sourceMappingURL=appStoreService.d.ts.map