// Push Notification Test Utilities
// Run pushNotificationTest() in browser console to debug push notifications

export const pushNotificationTest = () => {
  console.log("=== PUSH NOTIFICATION TEST SCRIPT ===");

  // Step 1: Check basic support
  console.log("\n1. CHECKING BASIC SUPPORT:");
  console.log("ServiceWorker:", 'serviceWorker' in navigator);
  console.log("PushManager:", 'PushManager' in window);
  console.log("Notification:", 'Notification' in window);
  console.log("Permission:", Notification.permission);

  // Step 2: Test service worker registration
  console.log("\n2. CHECKING SERVICE WORKER:");
  navigator.serviceWorker.getRegistrations().then(regs => {
    console.log("Active registrations:", regs.length);
    regs.forEach((reg, i) => {
      console.log(`Registration ${i}:`, {
        scope: reg.scope,
        state: reg.active?.state,
        scriptURL: reg.active?.scriptURL
      });
    });
  });

  // Step 3: Check current subscription
  console.log("\n3. CHECKING CURRENT SUBSCRIPTION:");
  navigator.serviceWorker.ready.then(registration => {
    return registration.pushManager.getSubscription();
  }).then(subscription => {
    if (subscription) {
      console.log("✅ Subscription exists:", {
        endpoint: subscription.endpoint.substring(0, 50) + "…",
        keys: {
          p256dh: subscription.getKey('p256dh') ? "present" : "missing",
          auth: subscription.getKey('auth') ? "present" : "missing"  
        }
      });

      // Store subscription globally for testing
      (window as any).testSubscription = subscription;
    } else {
      console.log("❌ No subscription found");
    }
  }).catch(error => {
    console.error("❌ Error checking subscription:", error);
  });

  // Step 4: Test VAPID key fetch
  console.log("\n4. TESTING VAPID KEY FETCH:");
  const supabaseUrl = 'https://ronqvzihpffgowyscgfm.supabase.co';
  fetch(`${supabaseUrl}/functions/v1/get-vapid-public-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('sb-ronqvzihpffgowyscgfm-auth-token')?.split('"')[3] || 'test'}`
    }
  }).then(response => response.json())
    .then(data => {
      if (data.publicKey) {
        console.log("✅ VAPID key fetched:", data.publicKey.substring(0, 20) + "…");
        (window as any).testVapidKey = data.publicKey;
      } else {
        console.error("❌ No VAPID key in response:", data);
      }
    }).catch(error => {
      console.error("❌ Error fetching VAPID key:", error);
    });

  // Helper function
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // Step 5: Manual subscription test
  console.log("\n5. MANUAL SUBSCRIPTION TEST:");
  (window as any).testSubscribe = async function() {
    try {
      console.log("Requesting notification permission…");
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        console.error("❌ Permission denied:", permission);
        return;
      }

      console.log("✅ Permission granted");

      if (!(window as any).testVapidKey) {
        console.error("❌ No VAPID key available - run step 4 first");
        return;
      }

      console.log("Getting service worker registration...");
      const registration = await navigator.serviceWorker.ready;

      console.log("Subscribing to push manager...");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array((window as any).testVapidKey)
      });

      console.log("✅ Subscription created:", {
        endpoint: subscription.endpoint.substring(0, 50) + "...",
        keys: {
          p256dh: subscription.getKey('p256dh') ? "present" : "missing",
          auth: subscription.getKey('auth') ? "present" : "missing"
        }
      });

      (window as any).testSubscription = subscription;
      return subscription;

    } catch (error) {
      console.error("❌ Subscription failed:", error);
    }
  };

  // Step 6: Manual push test
  (window as any).testPush = async function() {
    if (!(window as any).testSubscription) {
      console.error("❌ No subscription - run testSubscribe() first");
      return;
    }

    try {
      console.log("Sending test push notification…");

      const supabaseUrl = 'https://ronqvzihpffgowyscgfm.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('sb-ronqvzihpffgowyscgfm-auth-token')?.split('"')[3] || 'test'}`
        },
        body: JSON.stringify({
          targetUserId: 'test',
          type: 'test',
          title: 'Test Notification',
          body: 'This is a test push notification',
          data: { test: true }
        })
      });

      const result = await response.json();
      console.log("Push test result:", result);

      if (result.sent) {
        console.log("✅ Push notification sent successfully!");
      } else {
        console.error("❌ Push notification failed:", result);
      }

    } catch (error) {
      console.error("❌ Push test failed:", error);
    }
  };

  console.log("\n6. MANUAL TESTING:");
  console.log("Run: testSubscribe() - to create a push subscription");
  console.log("Then: testPush() - to send a test notification");
  console.log("\n=== TEST SCRIPT READY ===");
};

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).pushNotificationTest = pushNotificationTest;
}