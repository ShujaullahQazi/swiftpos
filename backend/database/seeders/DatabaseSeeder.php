<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\Customer;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create a Default User (admin/clerk)
        $user = User::create([
            'name' => 'Shujaullah Qazi',
            'email' => 'admin@swiftpos.com',
            'password' => Hash::make('password'),
        ]);

        // 2. Create Categories
        $categoriesData = [
            ['name' => 'Beverages', 'icon' => 'CupSoda', 'sort_order' => 1],
            ['name' => 'Apparel & Wear', 'icon' => 'Shirt', 'sort_order' => 2],
            ['name' => 'Electronics', 'icon' => 'Smartphone', 'sort_order' => 3],
            ['name' => 'Bakery & Fresh', 'icon' => 'Croissant', 'sort_order' => 4],
            ['name' => 'Snacks & Sweets', 'icon' => 'Candy', 'sort_order' => 5],
            ['name' => 'Office & Stationery', 'icon' => 'Notebook', 'sort_order' => 6],
        ];

        $categories = [];
        foreach ($categoriesData as $cat) {
            $categories[$cat['name']] = Category::create($cat);
        }

        // 3. Create Products
        $productsData = [
            // Beverages
            ['category' => 'Beverages', 'name' => 'Premium Roast Coffee', 'price' => 3.50, 'cost' => 0.80, 'stock' => 120, 'sku' => 'BEV-COF-01'],
            ['category' => 'Beverages', 'name' => 'Organic Green Tea', 'price' => 2.75, 'cost' => 0.50, 'stock' => 95, 'sku' => 'BEV-TEA-02'],
            ['category' => 'Beverages', 'name' => 'Fresh Orange Juice 500ml', 'price' => 4.25, 'cost' => 1.50, 'stock' => 50, 'sku' => 'BEV-OJ-03'],
            ['category' => 'Beverages', 'name' => 'Sparkling Mineral Water', 'price' => 1.99, 'cost' => 0.40, 'stock' => 200, 'sku' => 'BEV-WAT-04'],
            ['category' => 'Beverages', 'name' => 'Double Chocolate Milkshake', 'price' => 4.99, 'cost' => 1.90, 'stock' => 35, 'sku' => 'BEV-MSK-05'],

            // Apparel
            ['category' => 'Apparel & Wear', 'name' => 'Classic Cotton T-Shirt (Black)', 'price' => 19.99, 'cost' => 6.00, 'stock' => 40, 'sku' => 'APP-TSH-01'],
            ['category' => 'Apparel & Wear', 'name' => 'Slim Fit Denim Jeans', 'price' => 49.99, 'cost' => 15.00, 'stock' => 25, 'sku' => 'APP-JNS-02'],
            ['category' => 'Apparel & Wear', 'name' => 'Cozy Fleece Hoodie', 'price' => 39.99, 'cost' => 12.00, 'stock' => 15, 'sku' => 'APP-HUD-03'],
            ['category' => 'Apparel & Wear', 'name' => 'Athletic Run Socks (3-Pack)', 'price' => 12.50, 'cost' => 3.00, 'stock' => 80, 'sku' => 'APP-SOK-04'],

            // Electronics
            ['category' => 'Electronics', 'name' => 'USB-C Fast Charger 30W', 'price' => 15.99, 'cost' => 4.50, 'stock' => 65, 'sku' => 'ELE-CHG-01'],
            ['category' => 'Electronics', 'name' => 'Wireless Bluetooth Earbuds', 'price' => 29.99, 'cost' => 9.00, 'stock' => 30, 'sku' => 'ELE-EBD-02'],
            ['category' => 'Electronics', 'name' => 'Magnetic Phone Car Mount', 'price' => 9.99, 'cost' => 2.50, 'stock' => 45, 'sku' => 'ELE-MNT-03'],
            ['category' => 'Electronics', 'name' => 'Ultra Slim Power Bank 10k', 'price' => 24.99, 'cost' => 8.00, 'stock' => 20, 'sku' => 'ELE-PBK-04'],

            // Bakery
            ['category' => 'Bakery & Fresh', 'name' => 'Sourdough Bread Loaf', 'price' => 5.50, 'cost' => 1.20, 'stock' => 18, 'sku' => 'BAK-SDB-01'],
            ['category' => 'Bakery & Fresh', 'name' => 'Butter Croissant (Large)', 'price' => 2.99, 'cost' => 0.60, 'stock' => 40, 'sku' => 'BAK-CRO-02'],
            ['category' => 'Bakery & Fresh', 'name' => 'Blueberry Muffin (Fresh)', 'price' => 3.25, 'cost' => 0.75, 'stock' => 30, 'sku' => 'BAK-MUF-03'],
            ['category' => 'Bakery & Fresh', 'name' => 'Gluten-Free Chocolate Brownie', 'price' => 3.99, 'cost' => 1.00, 'stock' => 15, 'sku' => 'BAK-BRW-04'],

            // Snacks
            ['category' => 'Snacks & Sweets', 'name' => 'Sea Salt Potato Chips XL', 'price' => 4.50, 'cost' => 1.25, 'stock' => 70, 'sku' => 'SNA-CHP-01'],
            ['category' => 'Snacks & Sweets', 'name' => 'Artisanal Dark Chocolate Bar', 'price' => 3.99, 'cost' => 1.10, 'stock' => 85, 'sku' => 'SNA-CHL-02'],
            ['category' => 'Snacks & Sweets', 'name' => 'Salted Caramel Popcorn Bag', 'price' => 3.50, 'cost' => 0.90, 'stock' => 60, 'sku' => 'SNA-POP-03'],
            ['category' => 'Snacks & Sweets', 'name' => 'Roasted Almonds (Lightly Salted)', 'price' => 6.99, 'cost' => 2.20, 'stock' => 50, 'sku' => 'SNA-ALM-04'],

            // Stationery
            ['category' => 'Office & Stationery', 'name' => 'Hardcover Journal / Notebook', 'price' => 8.99, 'cost' => 2.00, 'stock' => 40, 'sku' => 'STA-NTB-01'],
            ['category' => 'Office & Stationery', 'name' => 'Gel Pen Retractable Pack (4x)', 'price' => 4.50, 'cost' => 1.00, 'stock' => 110, 'sku' => 'STA-PEN-02'],
            ['category' => 'Office & Stationery', 'name' => 'Sticky Notes Neon Pack (3x)', 'price' => 3.25, 'cost' => 0.70, 'stock' => 150, 'sku' => 'STA-STK-03'],
        ];

        $products = [];
        foreach ($productsData as $prod) {
            $cat = $categories[$prod['category']];
            $products[] = Product::create([
                'category_id' => $cat->id,
                'name' => $prod['name'],
                'price' => $prod['price'],
                'cost' => $prod['cost'],
                'stock_quantity' => $prod['stock'],
                'sku' => $prod['sku'],
                'barcode' => '880123' . rand(100000, 999999),
                'is_active' => true,
            ]);
        }

        // 4. Create Customers
        $customersData = [
            ['name' => 'Walking Customer', 'email' => null, 'phone' => null],
            ['name' => 'John Doe', 'email' => 'john.doe@gmail.com', 'phone' => '+15550192'],
            ['name' => 'Jane Smith', 'email' => 'jane.smith@yahoo.com', 'phone' => '+15553942'],
            ['name' => 'Robert Johnson', 'email' => 'robert.j@outlook.com', 'phone' => '+15559821'],
            ['name' => 'Emily Davis', 'email' => 'emily.d@gmail.com', 'phone' => '+15557762'],
        ];

        $customers = [];
        foreach ($customersData as $cust) {
            $customers[] = Customer::create($cust);
        }

        // 5. Create Past Orders & Payments
        $daysOfHistory = 15;
        $orderSeq = 1;

        for ($i = $daysOfHistory; $i >= 0; $i--) {
            // Generate multiple orders per day
            $ordersToCreate = rand(2, 6);
            if ($i == 0) $ordersToCreate = rand(4, 8); // More orders for today

            for ($o = 0; $o < $ordersToCreate; $o++) {
                $customer = $customers[rand(0, count($customers) - 1)];
                $itemsCount = rand(1, 4);
                $orderItems = [];
                $subtotal = 0;

                // Pick random products for this order
                $selectedProducts = array_rand($products, $itemsCount);
                if (!is_array($selectedProducts)) {
                    $selectedProducts = [$selectedProducts];
                }

                foreach ($selectedProducts as $prodIdx) {
                    $prod = $products[$prodIdx];
                    $qty = rand(1, 3);
                    $unitPrice = $prod->price;
                    $totalPrice = $unitPrice * $qty;

                    $orderItems[] = [
                        'product_id' => $prod->id,
                        'quantity' => $qty,
                        'unit_price' => $unitPrice,
                        'total_price' => $totalPrice,
                    ];
                    $subtotal += $totalPrice;
                }

                // Calculations
                $discount = rand(0, 1) === 1 ? (rand(0, 1) === 1 ? 5.00 : 0.00) : 0.00;
                if ($subtotal < $discount) $discount = 0;
                $taxRate = 0.08; // 8%
                $taxAmount = ($subtotal - $discount) * $taxRate;
                $total = ($subtotal - $discount) + $taxAmount;

                // Create Order
                $orderDate = now()->subDays($i)->subHours(rand(0, 8))->subMinutes(rand(0, 59));
                $orderNumber = 'SWP-' . str_pad($orderSeq++, 6, '0', STR_PAD_LEFT);

                $orderObj = Order::create([
                    'order_number' => $orderNumber,
                    'user_id' => $user->id,
                    'customer_id' => ($customer->name === 'Walking Customer') ? null : $customer->id,
                    'subtotal' => $subtotal,
                    'tax_amount' => $taxAmount,
                    'discount_amount' => $discount,
                    'total' => $total,
                    'status' => 'completed',
                    'created_at' => $orderDate,
                    'updated_at' => $orderDate,
                ]);

                // Create Order Items
                foreach ($orderItems as $item) {
                    OrderItem::create(array_merge($item, [
                        'order_id' => $orderObj->id,
                        'created_at' => $orderDate,
                        'updated_at' => $orderDate,
                    ]));
                }

                // Create Payment
                $paymentMethod = ['cash', 'card', 'mobile'][rand(0, 2)];
                $tendered = $total;
                $change = 0;

                if ($paymentMethod === 'cash') {
                    $tendered = ceil($total / 5) * 5; // Round to next 5
                    $change = $tendered - $total;
                }

                Payment::create([
                    'order_id' => $orderObj->id,
                    'amount' => $total,
                    'method' => $paymentMethod,
                    'tendered' => $tendered,
                    'change_amount' => $change,
                    'created_at' => $orderDate,
                    'updated_at' => $orderDate,
                ]);

                // Update customer total spent
                if ($customer->name !== 'Walking Customer') {
                    $customer->total_spent += $total;
                    $customer->visit_count += 1;
                    $customer->save();
                }
            }
        }
    }
}
