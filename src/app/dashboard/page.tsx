'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  getCurrentWeek, 
  getWeeklyLimit, 
  addTeaConsumption, 
  getDailyTeaConsumption, 
  getDailyTotalCups, 
  deleteTeaConsumption
} from '@/services/tea-service';
import toast from 'react-hot-toast';
import { Tea } from '@/types';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  const [currentWeek, setCurrentWeek] = useState(1);
  const [currentLimit, setCurrentLimit] = useState({ minCups: 0, maxCups: 4 });
  const [totalCups, setTotalCups] = useState(0);
  const [teas, setTeas] = useState<Tea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get current week and weekly limit
      const week = await getCurrentWeek(user.id);
      setCurrentWeek(week);
      
      const limit = getWeeklyLimit(week);
      setCurrentLimit(limit);
      
      // Get today's tea consumption
      const dailyTeas = await getDailyTeaConsumption(user.id);
      setTeas(dailyTeas);
      
      // Get total cups
      const total = await getDailyTotalCups(user.id);
      setTotalCups(total);
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
    
    if (user) {
      loadDashboardData();
      setupHourlyReminder();
    }
  }, [user, loading, router, loadDashboardData]);
  
  const setupHourlyReminder = () => {
    // Set up hourly reminder
    const interval = setInterval(() => {
      // Request notification permission
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
      
      // Show notification
      if (Notification.permission === 'granted') {
        new Notification('Tea Tracker Reminder', {
          body: 'Remember to log your tea consumption!',
          icon: '/icon.png'
        });
      }
      
      toast('Remember to log your tea consumption!', {
        icon: '🍵',
        duration: 5000,
      });
    }, 3600000); // 1 hour in milliseconds
    
    return () => clearInterval(interval);
  };
  
  const handleAddTeaCup = async () => {
    if (!user) return;
    
    try {
      // Check if adding another cup would exceed the daily limit
      if (totalCups >= currentLimit.maxCups) {
        toast.error(`You've reached your daily limit of ${currentLimit.maxCups} cups!`);
        
        // Send notification to admin
        fetch('/api/send-alert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'kshitiz23kumar@gmail.com',
            subject: 'Tea Consumption Limit Exceeded',
            message: `User ${user.email} has exceeded their daily tea limit for Week ${currentWeek}.`,
          }),
        });
        
        return;
      }
      
      // Add new tea consumption
      await addTeaConsumption(user.id, {
        name: 'Regular Tea',
        type: 'Black',
        quantity: 1,
        consumptionDate: new Date(),
      });
      
      toast.success('Tea consumption logged successfully!');
      
      // Refresh data
      loadDashboardData();
      
    } catch (error) {
      console.error("Error adding tea consumption:", error);
      toast.error("Failed to log tea consumption");
    }
  };
  
  const handleDeleteTea = async (teaId: string | undefined) => {
    if (!teaId || !user) return;
    
    try {
      await deleteTeaConsumption(teaId);
      toast.success('Tea entry deleted!');
      
      // Refresh data
      loadDashboardData();
      
    } catch (error) {
      console.error("Error deleting tea entry:", error);
      toast.error("Failed to delete tea entry");
    }
  };
  
  if (loading || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-center">Tea Tracker Dashboard</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="text-center mb-4">
          <div className="text-gray-600">Current Week</div>
          <div className="text-3xl font-bold text-green-700">Week {currentWeek}</div>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-gray-600">Your Limit</div>
            <div className="text-xl font-semibold">{currentLimit.maxCups} cups/day</div>
          </div>
          <div>
            <div className="text-gray-600">Today&apos;s Consumption</div>
            <div className={`text-xl font-semibold ${
              totalCups > currentLimit.maxCups ? 'text-red-600' : 'text-green-700'
            }`}>
              {totalCups} cups
            </div>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
          <div 
            className={`h-4 rounded-full ${
              totalCups > currentLimit.maxCups ? 'bg-red-600' : 'bg-green-600'
            }`} 
            style={{ width: `${Math.min(100, (totalCups / currentLimit.maxCups) * 100)}%` }}
          ></div>
        </div>
        
        <button
          onClick={handleAddTeaCup}
          className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
        >
          I Had a Cup of Tea
        </button>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Today&apos;s Tea Log</h2>
        
        {teas.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tea logged today</p>
        ) : (
          <ul className="space-y-3">
            {teas.map((tea) => (
              <li key={tea.id} className="flex justify-between items-center border-b pb-2">
                <div>
                  <div className="font-medium">{tea.name}</div>
                  <div className="text-sm text-gray-500">
                    {tea.consumptionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm">
                    {tea.quantity} cup
                  </div>
                  <button 
                    onClick={() => handleDeleteTea(tea.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}