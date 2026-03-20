import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";

admin.initializeApp();
const db = admin.firestore();

// Pinterest API Base URL
const PINTEREST_API_URL = "https://api.pinterest.com/v5/pins";

/**
 * Cloud Function Scheduler: Runs every 1 minute
 * Fetches pins where status == "pending" AND publish_at <= current time
 */
export const publishScheduledPins = functions.pubsub
  .schedule("every 1 minutes")
  .onRun(async (context) => {
    const now = admin.firestore.Timestamp.now();
    
    // 1. Fetch pending pins that are due for publishing
    const scheduledPinsRef = db.collection("scheduled_pins");
    const snapshot = await scheduledPinsRef
      .where("status", "==", "pending")
      .where("publish_at", "<=", now)
      .limit(50) // Process in batches to avoid timeouts
      .get();

    if (snapshot.empty) {
      functions.logger.info("No pending pins to publish at this time.");
      return null;
    }

    functions.logger.info(`Found ${snapshot.size} pins to process.`);

    const batch = db.batch();
    const pinsToProcess: Array<{ id: string; data: any }> = [];

    // 2. Update status to "processing" to prevent duplicate publishing
    snapshot.docs.forEach((doc) => {
      const pinData = doc.data();
      pinsToProcess.push({ id: doc.id, data: pinData });
      batch.update(doc.ref, { status: "processing" });
    });

    await batch.commit();

    // 3. Process each pin via Pinterest API
    const publishPromises = pinsToProcess.map(async (pin) => {
      const { id, data } = pin;
      const pinRef = scheduledPinsRef.doc(id);

      try {
        // Fetch the user's Pinterest access token. 
        // Assuming you store this in a 'users' collection or similar.
        const userDoc = await db.collection("users").doc(data.user_id).get();
        const userData = userDoc.data();
        
        // Note: You need to ensure you have a valid Pinterest access token for the user.
        // This might involve refreshing the token if it's expired.
        const accessToken = userData?.pinterestAccounts?.find((acc: any) => acc.id === data.account_id)?.token;

        if (!accessToken) {
          throw new Error(`No Pinterest access token found for user ${data.user_id}`);
        }

        // Construct Pinterest API payload
        const base64Data = data.image_url.split(',')[1];
        const payload = {
          board_id: data.board_id,
          title: data.title,
          description: data.description || "",
          link: data.link || "",
          media_source: {
            source_type: "image_base64",
            content_type: "image/jpeg",
            data: base64Data,
          },
        };

        // Call Pinterest API
        const response = await axios.post(PINTEREST_API_URL, payload, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        functions.logger.info(`Successfully published pin ${id}`, response.data);

        // On success -> update status to "published"
        await pinRef.update({
          status: "published",
          pinterest_pin_id: response.data.id,
          published_at: admin.firestore.FieldValue.serverTimestamp(),
        });

      } catch (error: any) {
        functions.logger.error(`Failed to publish pin ${id}`, error.response?.data || error.message);

        // On failure -> update status to "failed"
        await pinRef.update({
          status: "failed",
          error_message: error.response?.data?.message || error.message,
          failed_at: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    // Wait for all publish operations to complete
    await Promise.allSettled(publishPromises);

    functions.logger.info("Finished processing scheduled pins.");
    return null;
  });
