import React, { useState, useEffect } from "react";
import { useUser } from "../Context/userContext";

export const PaymentForm = () => {
  const { user, amount, transactionRecipient, setTransactionRecipient } = useUser();
  const [users, setUsers] = useState([]);
  const [toUser, setToUser] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch users list
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("http://localhost:3001/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: user.email }),
        });

        if (!response.ok) throw new Error("Failed to fetch users");

        const data = await response.json();
        setUsers(data.users.filter((u) => u.id !== user?.id));
      } catch (err) {
        console.error("Error fetching users:", err);
        setMessage({ text: "Failed to load recipients", type: "error" });
      }
    };

    if (user?.email) fetchUsers();
  }, [user]);

  // Sync form with transactionRecipient
  useEffect(() => {
    
    if (transactionRecipient) {
      setToUser(transactionRecipient.id);
    } else {
      setToUser("");
    }
  }, [transactionRecipient]);

  const handleSubmit = async (e) => {
    console.log(transactionRecipient,'---->transactionRep Pyament');
    var currentFlag = transactionRecipient.id!=null;
    if(transactionRecipient.id!=null){
      currentFlag = true;
    }
    else{
      currentFlag = false;
    }
    e.preventDefault();
    setIsLoading(true);
    setMessage({ text: "", type: "" });

    const amountNum = Number(transferAmount);
    const balanceNum = Number(amount);
    const recipientId = transactionRecipient?.id || toUser;
    console.log(transactionRecipient, '--->transferRecep');
    

    // Validation
    if (!recipientId || isNaN(amountNum) || amountNum <= 0) {
      setMessage({ text: "Please enter valid amount and recipient", type: "error" });
      setIsLoading(false);
      return;
    }

    if (amountNum > balanceNum) {
      setMessage({ text: "Insufficient balance!", type: "error" });
      setIsLoading(false);
      return;
    }

    try {

      
      const response = await fetch("http://localhost:3001/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_user_id: Number(recipientId),
          sender: Number(user.id),
          amount: amountNum,
          description: description.trim(),
          flag: currentFlag,
          transactionId: !transactionRecipient.tId ? null : transactionRecipient.tId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Payment failed");
      }

      setMessage({ text: "Payment successful!", type: "success" });
      setTransferAmount("");
      setDescription("");
      setTransactionRecipient({});
      // useEffect(() => {
        
      // }, [email]);

      
      console.log(currentFlag,'--->currflag');
      
    } catch (err) {
      console.error("Payment error:", err);
      setMessage({ text: err.message || "Payment failed", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {transactionRecipient ? "Confirm Payment" : "Send Payment"}
        </h2>

        {message.text && (
          <div className={`mb-4 p-3 rounded-md text-center ${
            message.type === "success" 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-700 mb-1">
              Recipient
            </label>
            <select
              id="recipient"
              value={toUser }
              onChange={(e) => setToUser(!transactionRecipient.name ? e.target.value : transactionRecipient.name)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              required
            >
              <option value="">Select Recipient</option>
              {users.map((user) => (
  user.id === transactionRecipient.id ? (
    <option key={user.id} value={user.id} selected>
      {user.name}
    </option>
  ) : (
    <option key={user.id} value={user.id}>
      {user.name}
    </option>
  )
))}
            </select>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Amount (PKR)
            </label>
            <input
              id="amount"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              placeholder="What's this payment for?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows="3"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isLoading ? "Processing..." : "Send Payment"}
          </button>
        </form>
      </div>
    </div>
  );
};