import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalAmount?: number;
  finalTotal?: number;
  paymentMethod: string;
  mpesaTransactionId?: string;
  paymentStatus: string;
  status: string;
  date: string;
  items: Array<{ name: string; quantity: number; price: number }>;
}

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'orders'));
      const ordersList: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        ordersList.push({ id: docSnap.id, ...docSnap.data() } as Order);
      });
      ordersList.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setOrders(ordersList);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApproveOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        paymentStatus: 'Verified',
        status: 'processing'
      });
      setOrders((prev) =>
        prev.map((ord) =>
          ord.id === orderId ? { ...ord, paymentStatus: 'Verified', status: 'processing' } : ord
        )
      );
      alert(`Order ${orderId} has been approved successfully!`);
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to approve order. Check console for details.');
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === 'pending') {
      return (
        order.paymentStatus?.toLowerCase().includes('pending') ||
        order.status?.toLowerCase() === 'pending'
      );
    }
    return true;
  });

  return (
    <div style={{ padding: '30px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: 'auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: '#110A08', margin: 0 }}>Opulence Slik - Admin Dashboard</h1>
          <Link to="/" style={{ color: '#666', textDecoration: 'none', fontSize: '14px' }}>← Back to Storefront</Link>
        </div>
        <button
          onClick={fetchOrders}
          style={{ padding: '10px 16px', background: '#110A08', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          Refresh Orders
        </button>
      </header>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button
          onClick={() => setFilter('pending')}
          style={{
            padding: '8px 16px',
            background: filter === 'pending' ? '#110A08' : '#eee',
            color: filter === 'pending' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Pending Verification
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '8px 16px',
            background: filter === 'all' ? '#110A08' : '#eee',
            color: filter === 'all' ? '#fff' : '#333',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          All Orders ({orders.length})
        </button>
      </div>

      {loading ? (
        <p>Loading orders from database...</p>
      ) : filteredOrders.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>No orders found in this view.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderRadius: '8px', overflow: 'hidden' }}>
            <thead>
              <tr style={{ background: '#f8f5f0', textAlign: 'left', borderBottom: '2px solid #eee' }}>
                <th style={{ padding: '12px' }}>Order Ref</th>
                <th style={{ padding: '12px' }}>Customer</th>
                <th style={{ padding: '12px' }}>Payment / M-PESA Code</th>
                <th style={{ padding: '12px' }}>Total</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{order.orderNumber || order.id}</td>
                  <td style={{ padding: '12px' }}>
                    <div>{order.customerName}</div>
                    <div style={{ fontSize: '12px', color: '#666' }}>{order.customerPhone}</div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontSize: '13px' }}>{order.paymentMethod}</div>
                    {order.mpesaTransactionId && (
                      <div style={{ fontWeight: 'bold', color: '#2e7d32', marginTop: '4px' }}>
                        Code: {order.mpesaTransactionId}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>KES {Number(order.finalTotal || order.totalAmount || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      padding: '4px 8px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      background: order.paymentStatus === 'Verified' ? '#e8f5e9' : '#fff3e0',
                      color: order.paymentStatus === 'Verified' ? '#2e7d32' : '#e65100',
                      fontWeight: 'bold'
                    }}>
                      {order.paymentStatus || order.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px', textAlign: 'center' }}>
                    {order.paymentStatus !== 'Verified' ? (
                      <button
                        onClick={() => handleApproveOrder(order.id)}
                        style={{
                          padding: '6px 14px',
                          background: '#2e7d32',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Approve Order
                      </button>
                    ) : (
                      <span style={{ color: '#2e7d32', fontSize: '14px', fontWeight: 'bold' }}>✔ Approved</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
