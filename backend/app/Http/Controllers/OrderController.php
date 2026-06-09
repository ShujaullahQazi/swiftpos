<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $query = Order::with(['customer', 'user']);

        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where('order_number', 'like', "%{$search}%");
        }

        return response()->json($query->latest()->paginate(15));
    }

    public function show($id)
    {
        $order = Order::with(['customer', 'user', 'items.product', 'payments'])->findOrFail($id);
        return response()->json($order);
    }

    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.quantity' => 'required|integer|min:1',
            'discount_amount' => 'required|numeric|min:0',
            'payment_method' => 'required|string|in:cash,card,mobile',
            'payment_tendered' => 'required|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            $user = $request->user();
            $subtotal = 0;
            $itemsToCreate = [];

            // Calculate prices and check stock
            foreach ($request->items as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);

                if ($product->stock_quantity < $itemData['quantity']) {
                    throw new Exception("Product '{$product->name}' is out of stock. Available: {$product->stock_quantity}. Requested: {$itemData['quantity']}");
                }

                // Deduct stock
                $product->decrement('stock_quantity', $itemData['quantity']);

                $unitPrice = $product->price;
                $totalPrice = $unitPrice * $itemData['quantity'];
                $subtotal += $totalPrice;

                $itemsToCreate[] = [
                    'product_id' => $product->id,
                    'quantity' => $itemData['quantity'],
                    'unit_price' => $unitPrice,
                    'total_price' => $totalPrice,
                ];
            }

            // Calculations
            $discount = $request->discount_amount;
            if ($subtotal < $discount) {
                $discount = $subtotal;
            }
            $taxRate = 0.08; // 8% tax
            $taxableAmount = $subtotal - $discount;
            $taxAmount = $taxableAmount * $taxRate;
            $total = $taxableAmount + $taxAmount;

            // Generate Order Number
            $lastOrder = Order::latest('id')->first();
            $nextId = $lastOrder ? $lastOrder->id + 1 : 1;
            $orderNumber = 'SWP-' . str_pad($nextId, 6, '0', STR_PAD_LEFT);

            // Create Order
            $order = Order::create([
                'order_number' => $orderNumber,
                'user_id' => $user->id,
                'customer_id' => $request->customer_id,
                'subtotal' => $subtotal,
                'tax_amount' => $taxAmount,
                'discount_amount' => $discount,
                'total' => $total,
                'status' => 'completed',
                'notes' => $request->notes,
            ]);

            // Save Order Items
            foreach ($itemsToCreate as $item) {
                OrderItem::create(array_merge($item, [
                    'order_id' => $order->id
                ]));
            }

            // Save Payment
            $tendered = $request->payment_tendered;
            $change = 0;
            if ($request->payment_method === 'cash') {
                $change = max(0, $tendered - $total);
            }

            Payment::create([
                'order_id' => $order->id,
                'amount' => $total,
                'method' => $request->payment_method,
                'tendered' => $tendered,
                'change_amount' => $change,
            ]);

            // Update customer totals
            if ($request->customer_id) {
                $customer = Customer::findOrFail($request->customer_id);
                $customer->increment('total_spent', $total);
                $customer->increment('visit_count', 1);
            }

            DB::commit();

            // Load relations and return
            $order->load(['customer', 'user', 'items.product', 'payments']);

            return response()->json([
                'message' => 'Order created successfully',
                'order' => $order
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => $e->getMessage()
            ], 400);
        }
    }
}
