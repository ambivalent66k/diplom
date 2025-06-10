import React, { useState } from 'react';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuth } from '../hooks/useAuth';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
  });
  const [formErrors, setFormErrors] = useState({});
  
  const { login, register, loading, error, clearError } = useAuth();
  
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear general error
    if (error) {
      clearError();
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.username.trim()) {
      errors.username = 'Имя пользователя обязательно';
    }
    
    if (!formData.password) {
      errors.password = 'Пароль обязателен';
    } else if (formData.password.length < 6) {
      errors.password = 'Пароль должен содержать минимум 6 символов';
    }
    
    if (!isLogin) {
      if (!formData.email.trim()) {
        errors.email = 'Email обязателен';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errors.email = 'Неверный формат email';
      }
      
      if (!formData.password_confirm) {
        errors.password_confirm = 'Подтверждение пароля обязательно';
      } else if (formData.password !== formData.password_confirm) {
        errors.password_confirm = 'Пароли не совпадают';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      let result;
      
      if (isLogin) {
        result = await login({
          username: formData.username,
          password: formData.password,
        });
      } else {
        result = await register(formData);
      }
      
      // Проверяем результат
      if (result && !result.success) {
        console.error('Auth failed:', result.error);
      }
    } catch (err) {
      console.error('Auth error:', err);
    }
  };
  
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      username: '',
      email: '',
      password: '',
      password_confirm: '',
    });
    setFormErrors({});
    clearError();
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white shadow-lg p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Music</h1>
          <p className="text-gray-500">
            {isLogin ? 'Добро пожаловать' : 'Создать аккаунт'}
          </p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}
        
        {/* Form - ОБЕРНУТО В FORM TAG */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            placeholder="Имя пользователя"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            error={formErrors.username}
            disabled={loading}
            autoComplete="username"
          />
          
          {!isLogin && (
            <Input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              error={formErrors.email}
              disabled={loading}
              autoComplete="email"
            />
          )}
          
          <Input
            type="password"
            placeholder="Пароль"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            error={formErrors.password}
            disabled={loading}
            autoComplete={isLogin ? "current-password" : "new-password"}
          />
          
          {!isLogin && (
            <Input
              type="password"
              placeholder="Подтвердите пароль"
              value={formData.password_confirm}
              onChange={(e) => handleInputChange('password_confirm', e.target.value)}
              error={formErrors.password_confirm}
              disabled={loading}
              autoComplete="new-password"
            />
          )}
          
          {/* ИЗМЕНЕНА КНОПКА НА TYPE="SUBMIT" */}
          <Button
            type="submit"
            loading={loading}
            className="w-full"
            disabled={loading}
          >
            {isLogin ? 'Войти' : 'Зарегистрироваться'}
          </Button>
        </form>
        
        {/* Toggle Mode */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={toggleMode}
            className="text-gray-500 hover:text-gray-700 transition-colors text-sm"
            disabled={loading}
          >
            {isLogin ? 'Нет аккаунта? Зарегистрироваться' : 'Есть аккаунт? Войти'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;