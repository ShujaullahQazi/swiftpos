<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats()
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();

        // Today's Stats
        $todayOrders = Order::whereDate('created_at', $today)->where('status', 'completed');
        $todaySales = $todayOrders->sum('total');
        $todayCount = $todayOrders->count();

        // Yesterday's Stats
        $yesterdayOrders = Order::whereDate('created_at', $yesterday)->where('status', 'completed');
        $yesterdaySales = $yesterdayOrders->sum('total');

        // % Changes
        $salesChangePercent = 0;
        if ($yesterdaySales > 0) {
            $salesChangePercent = (($todaySales - $yesterdaySales) / $yesterdaySales) * 100;
        }

        // Active products total
        $activeProductsCount = Product::where('is_active', true)->count();
        $lowStockCount = Product::where('is_active', true)->where('stock_quantity', '<=', 10)->count();

        // Monthly sales
        $startOfMonth = Carbon::now()->startOfMonth();
        $monthlySales = Order::where('created_at', '>=', $startOfMonth)->where('status', 'completed')->sum('total');

        return response()->json([
            'today_sales' => round($todaySales, 2),
            'today_orders_count' => $todayCount,
            'yesterday_sales' => round($yesterdaySales, 2),
            'sales_change_percent' => round($salesChangePercent, 1),
            'active_products_count' => $activeProductsCount,
            'low_stock_count' => $lowStockCount,
            'monthly_sales' => round($monthlySales, 2),
        ]);
    }

    public function chartData()
    {
        $startDate = Carbon::today()->subDays(14);

        // Group sales by day
        // SQLite syntax uses strftime
        $sales = Order::where('created_at', '>=', $startDate)
            ->where('status', 'completed')
            ->select(
                DB::raw("date(created_at) as date_label"),
                DB::raw("sum(total) as total_sales"),
                DB::raw("count(id) as order_count")
            )
            ->groupBy('date_label')
            ->orderBy('date_label')
            ->get();

        // Fill in missing dates with 0 so the chart has continuous dates
        $chartData = [];
        $current = $startDate->clone();
        $today = Carbon::today();

        while ($current->lte($today)) {
            $dateStr = $current->format('Y-m-d');
            $match = $sales->firstWhere('date_label', $dateStr);

            $chartData[] = [
                'date' => $current->format('M d'),
                'full_date' => $dateStr,
                'sales' => $match ? round((float)$match->total_sales, 2) : 0,
                'orders' => $match ? (int)$match->order_count : 0,
            ];

            $current->addDay();
        }

        return response()->json($chartData);
    }

    public function topProducts()
    {
        $top = OrderItem::select('product_id', DB::raw('sum(quantity) as total_qty'), DB::raw('sum(total_price) as total_revenue'))
            ->groupBy('product_id')
            ->orderBy('total_qty', 'desc')
            ->with('product')
            ->limit(5)
            ->get();

        $formatted = $top->map(function ($item) {
            return [
                'name' => $item->product ? $item->product->name : 'Deleted Product',
                'sku' => $item->product ? $item->product->sku : '',
                'quantity' => $item->total_qty,
                'revenue' => round((float)$item->total_revenue, 2),
            ];
        });

        return response()->json($formatted);
    }

    public function lowStock()
    {
        $products = Product::with('category')
            ->where('stock_quantity', '<=', 10)
            ->where('is_active', true)
            ->orderBy('stock_quantity')
            ->limit(10)
            ->get();

        return response()->json($products);
    }
}
