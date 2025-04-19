import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../Context/userContext';

function AuthForm() {
  const { setUserData } = useUser(); // Assuming your context has setUser function
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [message, setMessage] = useState({ text: '', type: '' });
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      setMessage({ text: 'Password must be at least 8 characters long', type: 'error' });
      return;
    }

    try {
      const endpoint = isLogin ? 'signin' : 'signup';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : { name: formData.name, email: formData.email, password: formData.password };

      const response = await fetch(`http://localhost:3001/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        if (isLogin) {
          // Handle successful login
          setUserData({
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            amount: data.user.amount,
            transactions: data.user.transactions || { list: [] }
          });
          navigate('/dashboard');
        } else {
          // Handle successful signup
          setMessage({ 
            text: 'Account created successfully! Please login.', 
            type: 'success' 
          });
          setIsLogin(true);
          // Clear password field after signup
          setFormData(prev => ({ ...prev, password: '' }));
        }
      } else {
        setMessage({ text: data.message || 'Request failed', type: 'error' });
      }
    } catch (error) {
      console.error('Auth error:', error);
      setMessage({ 
        text: 'An error occurred. Please try again.', 
        type: 'error' 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          {isLogin ? 'Login' : 'Sign Up'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                placeholder="Full Name"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="Email"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="Password"
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
          >
            {isLogin ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage({ text: '', type: '' });
              }}
              className="ml-2 text-blue-600 hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </button>
          </p>
        </div>

        {message.text && (
          <p className={`text-center mt-4 ${
            message.type === 'error' ? 'text-red-500' : 'text-green-500'
          }`}>
            {message.text}
          </p>
        )}
      </div>
    </div>
  );
}

export default AuthForm;