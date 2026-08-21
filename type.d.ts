import { Models } from "react-native-appwrite";

export type UserRole = 'admin' | 'seller' | 'customer';

export interface ProductExtra {
    id: string;
    name: string;
    price: number;
    type?: string;
}

export interface Banner extends Models.Document {
    title: string;
    subtitle?: string;
    imageUrl: string;
    gradientStart: string;
    gradientEnd: string;
    isActive: boolean;
    displayOrder: number;
    targetCategory?: string;
    targetType?: 'product' | 'category' | 'external';
    targetId?: string;
}

export interface Store extends Models.Document {
    userId: string;
    storeName: string;
    description: string;
    logoUrl?: string;
    bannerUrl?: string;
    address: string;
    phone: string;
    commissionRate: number;
    status: 'active' | 'pending' | 'suspended';
    walletBalance?: number;
    allowedCategories?: string;
}

export interface WalletTransaction extends Models.Document {
    userId: string;
    amount: number;
    type: 'credit' | 'debit';
    category?: 'deposit' | 'order_payment' | 'refund' | 'admin_adjustment';
    description?: string;
    reference?: string;
    createdAt?: string;
}

export interface SellerPayout extends Models.Document {
    sellerId: string;
    storeName?: string;
    amount: number;
    commissionDeducted?: number;
    status: 'pending' | 'completed' | 'failed';
    paymentMethod?: string;
    reference?: string;
    createdAt?: string;
}

export interface Coupon extends Models.Document {
    code: string;
    discountType: 'flat' | 'percentage';
    discountValue: number;
    minCartAmount?: number;
    maxDiscountAmount?: number;
    validUntil?: string;
    usageLimit?: number;
    usedCount?: number;
    isActive: boolean;
}

export interface PlatformPolicies extends Models.Document {
    cartMode: 'single_seller' | 'multi_seller';
    productApprovalRequired: boolean;
    sellerOrderCancellationAllowed: boolean;
    defaultCommissionRate: number;
    updatedAt?: string;
}

export interface MenuItem extends Models.Document {
    name: string;
    price: number;
    image_url: string;
    description: string;
    calories?: number;
    protein?: number;
    rating?: number;
    type?: string;
    sellerId?: string;
    categoryId?: string;
    discountPrice?: number;
    stock?: number;
    isActive?: boolean;
    extras?: string; // JSON string array of ProductExtra
}

export interface Category extends Models.Document {
    name: string;
    description?: string;
    slug?: string;
    iconUrl?: string;
    isActive?: boolean;
}

export interface User extends Models.Document {
    name: string;
    email: string;
    avatar: string;
    role?: UserRole;
    phone?: string;
    accountId?: string;
}

export interface CartCustomization {
    id: string;
    name: string;
    price: number;
    type: string;
}

export interface CartItemType {
    id: string; // menu item id
    name: string;
    price: number;
    image_url: string;
    quantity: number;
    customizations?: CartCustomization[];
    sellerId?: string;
}

export interface CartStore {
    items: CartItemType[];
    addItem: (item: Omit<CartItemType, "quantity">) => void;
    removeItem: (id: string, customizations?: CartCustomization[]) => void;
    increaseQty: (id: string, customizations?: CartCustomization[]) => void;
    decreaseQty: (id: string, customizations?: CartCustomization[]) => void;
    clearCart: () => void;
    getTotalItems: () => number;
    getTotalPrice: () => number;
}

interface TabBarIconProps {
    focused: boolean;
    icon: any;
    title: string;
}

interface PaymentInfoStripeProps {
    label: string;
    value: string;
    labelStyle?: string;
    valueStyle?: string;
}

interface CustomButtonProps {
    onPress?: () => void;
    title?: string;
    style?: string;
    leftIcon?: React.ReactNode;
    textStyle?: string;
    isLoading?: boolean;
}

interface CustomHeaderProps {
    title?: string;
}

interface CustomInputProps {
    placeholder?: string;
    value?: string;
    onChangeText?: (text: string) => void;
    label: string;
    secureTextEntry?: boolean;
    keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
}

interface ProfileFieldProps {
    label: string;
    value: string;
    icon: any;
}

interface CreateUserParams {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}

interface SignInParams {
    email: string;
    password: string;
}

interface GetMenuParams {
    category?: string;
    query?: string;
    sellerId?: string;
}

