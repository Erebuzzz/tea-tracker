import * as functions from 'firebase-functions';
import * as pubsub from 'firebase-functions/v1/pubsub';
import * as firestore from 'firebase-functions/v1/firestore';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';

admin.initializeApp();

// Create a nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.password,
  },
});

// Weekly limits
const weeklyLimits = [
  { week: 1, maxCups: 4 },
  { week: 2, maxCups: 3 },
  { week: 3, maxCups: 2 },
  { week: 4, maxCups: 1 },
  { week: 5, maxCups: 0 },
];

export const checkTeaLimits = firestore
  .document('teas/{teaId}')
  .onCreate(async (snap, context) => {
    try {
      const teaData = snap.data();
      const userId = teaData.userId;
      
      // Get user data
      const userRef = admin.firestore().doc(`users/${userId}`);
      const userDoc = await userRef.get();
      
      if (!userDoc.exists) {
        console.log('User not found');
        return null;
      }
      
      const userData = userDoc.data();
      if (!userData) return null;
      
      const planStartDate = userData.planStartDate?.toDate() || new Date();
      const userEmail = userData.email;
      const adminEmail = 'kshitiz23kumar@gmail.com';
      
      // Calculate current week
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - planStartDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const currentWeek = Math.min(5, Math.max(1, Math.ceil(diffDays / 7)));
      
      // Get weekly limit
      const currentLimit = weeklyLimits.find(limit => limit.week === currentWeek) 
        || weeklyLimits[weeklyLimits.length - 1];
      
      // Count today's tea consumption
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      
      const teaSnapshot = await admin.firestore()
        .collection('teas')
        .where('userId', '==', userId)
        .where('consumptionDate', '>=', admin.firestore.Timestamp.fromDate(startOfDay))
        .where('consumptionDate', '<=', admin.firestore.Timestamp.fromDate(endOfDay))
        .get();
      
      let totalCups = 0;
      teaSnapshot.forEach(doc => {
        totalCups += doc.data().quantity || 0;
      });
      
      console.log(`User ${userEmail} has consumed ${totalCups} cups today. Limit is ${currentLimit.maxCups}`);
      
      // Send alert if exceeded
      if (totalCups > currentLimit.maxCups) {
        const userRemindEmail = userData.notifications?.email !== false;
        
        if (userRemindEmail) {
          // Send reminder to the user
          const userMailOptions = {
            from: '"Tea Tracker" <noreply@teatracker.app>',
            to: userEmail,
            subject: `Tea Consumption Reminder`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2d3748;">Tea Consumption Alert</h2>
                <p>Hi there,</p>
                <p>You have consumed <strong>${totalCups} cups</strong> of tea today, which exceeds your daily limit of <strong>${currentLimit.maxCups} cups</strong> for Week ${currentWeek}.</p>
                <p>Remember, your goal is to gradually reduce your tea consumption according to the plan:</p>
                <ul>
                  <li>Week 1: 3-4 cups/day</li>
                  <li>Week 2: 2-3 cups/day</li>
                  <li>Week 3: 1-2 cups/day</li>
                  <li>Week 4: 0-1 cup/day</li>
                  <li>Week 5: 0 cups/day</li>
                </ul>
                <p>Stay strong! You can achieve your goal!</p>
                <p>- Tea Tracker Team</p>
              </div>
            `,
          };
          
          await transporter.sendMail(userMailOptions);
          console.log(`Reminder email sent to ${userEmail}`);
        }
        
        // Send alert to admin
        const adminMailOptions = {
          from: '"Tea Tracker Alert" <noreply@teatracker.app>',
          to: adminEmail,
          subject: `Alert: ${userEmail} has exceeded tea limit`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #e53e3e;">Tea Consumption Alert</h2>
              <p>User <strong>${userEmail}</strong> has consumed ${totalCups} cups of tea today.</p>
              <p>This exceeds the limit of ${currentLimit.maxCups} cups for week ${currentWeek}.</p>
              <p>You might want to check in with them to provide support.</p>
            </div>
          `,
        };
        
        await transporter.sendMail(adminMailOptions);
        console.log('Alert email sent to admin');
      }
      
      return null;
    } catch (error) {
      console.error('Error in checkTeaLimits function:', error);
      return null;
    }
  });

// Daily reminder for tracking tea consumption
export const dailyReminder = pubsub
  .schedule('0 9,12,15,18 * * *') // Runs at 9am, 12pm, 3pm, and 6pm every day
  .timeZone('Asia/Kolkata') // IST timezone
  .onRun(async (context) => {
    try {
      // Get all users
      const usersSnapshot = await admin.firestore().collection('users').get();
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Skip users who have disabled reminders
        if (userData.notifications?.reminders === false) {
          continue;
        }
        
        const userEmail = userData.email;
        if (!userEmail) continue;
        
        // Send reminder email
        const mailOptions = {
          from: '"Tea Tracker" <noreply@teatracker.app>',
          to: userEmail,
          subject: 'Remember to Log Your Tea Consumption',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2d3748;">Tea Tracker Reminder</h2>
              <p>Hi there,</p>
              <p>This is a friendly reminder to log your tea consumption in the Tea Tracker app.</p>
              <p>Consistent tracking helps you stay accountable and achieve your goal of reducing tea consumption.</p>
              <p><a href="https://tea-tracker15.web.app/dashboard" style="background-color: #48bb78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Log Your Tea</a></p>
              <p>Stay committed to your goal!</p>
              <p>- Tea Tracker Team</p>
            </div>
          `,
        };
        
        await transporter.sendMail(mailOptions);
        console.log(`Daily reminder sent to ${userEmail}`);
      }
      
      return null;
    } catch (error) {
      console.error('Error sending daily reminders:', error);
      return null;
    }
  });

// API endpoint to send alerts manually
export const sendAlert = functions.https.onRequest(async (req, res) => {
  try {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.status(204).send('');
      return;
    }
    
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }
    
    const { email, subject, message } = req.body;
    
    if (!email || !subject || !message) {
      res.status(400).send('Missing required fields');
      return;
    }
    
    const mailOptions = {
      from: '"Tea Tracker" <noreply@teatracker.app>',
      to: email,
      subject: subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e53e3e;">${subject}</h2>
          <p>${message}</p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    res.status(200).send('Alert email sent successfully');
  } catch (error) {
    console.error('Error sending alert email:', error);
    res.status(500).send('Error sending alert email');
  }
});