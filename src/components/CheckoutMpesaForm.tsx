import React, { useState } from "react";

type Item = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

type Props = {
  items: Item[];
  totalAmount: number;
};

export default function CheckoutMpesaForm({ items, totalAmount }: Props) {
  const [form, setForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    deliveryAddress: "",
    mpesaTransactionId: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/checkout/manual-mpesa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          totalAmount,
          items: items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to submit order");
      }

      setMessage("Order placed successfully. Payment is pending admin verification.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <h3 className="text-lg font-semibold">M-PESA Manual Payment</h3>
        <p className="mt-2">
          <strong>Till Number:</strong> 5348124
        </p>
        <p>
          <strong>Payment Method:</strong> M-PESA Buy Goods and Services
        </p>
        <p className="mt-2 text-sm">
          Please pay the total amount to the till number above, then enter your M-PESA
          transaction ID below.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="block">
          Full Name
          <input
            name="customerName"
            value={form.customerName}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block">
          Email
          <input
            type="email"
            name="customerEmail"
            value={form.customerEmail}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block">
          Phone Number
          <input
            type="phone"
            name="customerPhone"
            value={form.customerPhone}
            onChange={handleChange}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block">
          Delivery Address
          <textarea
            name="deliveryAddress"
            value={form.deliveryAddress}
            onChange={handleChange}
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <label className="block">
          M-PESA Transaction ID
          <input
            name="mpesaTransactionId"
            value={form.mpesaTransactionId}
            onChange={handleChange}
            placeholder="e.g., RKT1234567"
            required
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="mt-4 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Submitting..." : "Submit order"}
      </button>

      {message && <p className="mt-3 text-sm text-gray-700">{message}</p>}
    </form>
  );
}
