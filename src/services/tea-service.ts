import { 
  collection, 
  addDoc, 
  doc, 
  getDoc,
  getDocs,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Tea, TeaWeekLimit } from '@/types';

// Weekly limits
export const weeklyLimits: TeaWeekLimit[] = [
  { week: 1, minCups: 3, maxCups: 4 },
  { week: 2, minCups: 2, maxCups: 3 },
  { week: 3, minCups: 1, maxCups: 2 },
  { week: 4, minCups: 0, maxCups: 1 },
  { week: 5, minCups: 0, maxCups: 0 },
];

// Get current week number based on plan start date
export const getCurrentWeek = async (userId: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    
    if (!userDoc.exists() || !userDoc.data().planStartDate) {
      // If no plan start date exists, create one and return week 1
      await updateDoc(doc(db, 'users', userId), {
        planStartDate: serverTimestamp(),
      });
      return 1;
    }
    
    const planStartDate = userDoc.data().planStartDate.toDate();
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - planStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    let weekNumber = Math.ceil(diffDays / 7);
    
    // Ensure week number is between 1 and 5
    weekNumber = Math.max(1, Math.min(5, weekNumber));
    
    return weekNumber;
  } catch (error) {
    console.error("Error getting current week:", error);
    return 1; // Default to week 1 if there's an error
  }
};

// Get weekly limit for a specific week
export const getWeeklyLimit = (week: number): TeaWeekLimit => {
  const limit = weeklyLimits.find(l => l.week === week);
  return limit || weeklyLimits[weeklyLimits.length - 1]; // Default to last week if not found
};

// Add tea consumption entry
export const addTeaConsumption = async (userId: string, teaData: Omit<Tea, 'id' | 'userId'>): Promise<Tea> => {
  try {
    const teaRef = await addDoc(collection(db, 'teas'), {
      userId,
      ...teaData,
      consumptionDate: Timestamp.fromDate(teaData.consumptionDate),
      createdAt: serverTimestamp(),
    });
    
    return {
      id: teaRef.id,
      userId,
      ...teaData,
    };
  } catch (error) {
    console.error("Error adding tea consumption:", error);
    throw error;
  }
};

// Get daily tea consumption
export const getDailyTeaConsumption = async (userId: string, date: Date = new Date()): Promise<Tea[]> => {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const teaQuery = query(
      collection(db, 'teas'),
      where('userId', '==', userId),
      where('consumptionDate', '>=', Timestamp.fromDate(startOfDay)),
      where('consumptionDate', '<=', Timestamp.fromDate(endOfDay)),
      orderBy('consumptionDate', 'asc')
    );
    
    const querySnapshot = await getDocs(teaQuery);
    
    const teas: Tea[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teas.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        type: data.type,
        quantity: data.quantity,
        consumptionDate: data.consumptionDate.toDate(),
      });
    });
    
    return teas;
  } catch (error) {
    console.error("Error getting daily tea consumption:", error);
    throw error;
  }
};

// Get weekly tea consumption
export const getWeeklyTeaConsumption = async (userId: string, startDate: Date): Promise<Tea[]> => {
  try {
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    const teaQuery = query(
      collection(db, 'teas'),
      where('userId', '==', userId),
      where('consumptionDate', '>=', Timestamp.fromDate(startDate)),
      where('consumptionDate', '<=', Timestamp.fromDate(endDate)),
      orderBy('consumptionDate', 'asc')
    );
    
    const querySnapshot = await getDocs(teaQuery);
    
    const teas: Tea[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      teas.push({
        id: doc.id,
        userId: data.userId,
        name: data.name,
        type: data.type,
        quantity: data.quantity,
        consumptionDate: data.consumptionDate.toDate(),
      });
    });
    
    return teas;
  } catch (error) {
    console.error("Error getting weekly tea consumption:", error);
    throw error;
  }
};

// Delete a tea entry
export const deleteTeaConsumption = async (teaId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'teas', teaId));
  } catch (error) {
    console.error("Error deleting tea entry:", error);
    throw error;
  }
};

// Get total cups for a specific day
export const getDailyTotalCups = async (userId: string, date: Date = new Date()): Promise<number> => {
  try {
    const teas = await getDailyTeaConsumption(userId, date);
    return teas.reduce((total, tea) => total + tea.quantity, 0);
  } catch (error) {
    console.error("Error getting daily total cups:", error);
    return 0;
  }
};

// Check if user has exceeded daily limit
export const hasExceededDailyLimit = async (userId: string): Promise<boolean> => {
  try {
    const week = await getCurrentWeek(userId);
    const limit = getWeeklyLimit(week);
    const totalCups = await getDailyTotalCups(userId);
    return totalCups > limit.maxCups;
  } catch (error) {
    console.error("Error checking if user has exceeded daily limit:", error);
    return false;
  }
}