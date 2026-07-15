import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch
} from "firebase/firestore";
import { db } from "../firebase";
import { getClientId } from "./clientId";

const appsCollection = collection(db, "apps");

function normalizeTimestamp(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  return 0;
}

function mapApp(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...data,
    likesCount: Number(data.likesCount || 0),
    downloadsCount: Number(data.downloadsCount || 0),
    ratingAverage: Number(data.ratingAverage || 0),
    ratingCount: Number(data.ratingCount || 0),
    screenshots: Array.isArray(data.screenshots) ? data.screenshots.filter(Boolean) : [],
    createdAtMs: normalizeTimestamp(data.createdAt),
    updatedAtMs: normalizeTimestamp(data.contentUpdatedAt || data.updatedAt)
  };
}

async function fetchPublishedAppsSorted() {
  const result = await getDocs(query(appsCollection, where("status", "==", "published")));
  return result.docs
    .map(mapApp)
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

export async function getPublishedAppsPage({ pageSize = 24, cursor = 0 } = {}) {
  const safePageSize = Math.max(1, Math.min(60, Number(pageSize) || 24));
  const offset = Math.max(0, Number(cursor) || 0);
  const apps = await fetchPublishedAppsSorted();
  const visibleApps = apps.slice(offset, offset + safePageSize);
  const nextOffset = offset + visibleApps.length;

  return {
    apps: visibleApps,
    cursor: nextOffset,
    hasMore: nextOffset < apps.length
  };
}

export async function getPublishedApps() {
  return fetchPublishedAppsSorted();
}

export async function getAppBySlug(slug) {
  const normalizedSlug = String(slug || "").trim();
  if (!normalizedSlug) return null;

  const q = query(
    appsCollection,
    where("status", "==", "published"),
    where("slug", "==", normalizedSlug),
    limit(1)
  );
  const result = await getDocs(q);
  return result.empty ? null : mapApp(result.docs[0]);
}

export async function likeApp(appId) {
  const clientId = getClientId();
  const appRef = doc(db, "apps", appId);
  const likeRef = doc(db, "apps", appId, "likes", clientId);

  return runTransaction(db, async (transaction) => {
    const likeSnapshot = await transaction.get(likeRef);
    if (likeSnapshot.exists()) return { alreadyLiked: true };

    transaction.set(likeRef, { createdAt: serverTimestamp() });
    transaction.update(appRef, {
      likesCount: increment(1),
      metricsUpdatedAt: serverTimestamp()
    });

    return { alreadyLiked: false };
  });
}

export async function submitRating(appId, rating) {
  const safeRating = Math.max(1, Math.min(5, Number(rating)));
  const clientId = getClientId();
  const appRef = doc(db, "apps", appId);
  const ratingRef = doc(db, "apps", appId, "ratings", clientId);

  return runTransaction(db, async (transaction) => {
    const ratingSnapshot = await transaction.get(ratingRef);
    if (ratingSnapshot.exists()) return { alreadyRated: true };

    const appSnapshot = await transaction.get(appRef);
    if (!appSnapshot.exists()) throw new Error("La app no existe.");

    const app = appSnapshot.data();
    const currentAverage = Number(app.ratingAverage || 0);
    const currentCount = Number(app.ratingCount || 0);
    const nextCount = currentCount + 1;
    const nextAverage = Number(((currentAverage * currentCount + safeRating) / nextCount).toFixed(1));

    transaction.set(ratingRef, { rating: safeRating, createdAt: serverTimestamp() });
    transaction.update(appRef, {
      ratingAverage: nextAverage,
      ratingCount: nextCount,
      metricsUpdatedAt: serverTimestamp()
    });

    return { alreadyRated: false, ratingAverage: nextAverage, ratingCount: nextCount };
  });
}

export async function registerDownloadClick(app, targetUrl) {
  const appRef = doc(db, "apps", app.id);
  const clickRef = doc(collection(db, "apps", app.id, "downloadClicks"));
  const batch = writeBatch(db);

  batch.set(clickRef, {
    targetUrl: String(targetUrl || app.playStoreUrl || app.downloadUrl || ""),
    createdAt: serverTimestamp()
  });
  batch.update(appRef, {
    downloadsCount: increment(1),
    metricsUpdatedAt: serverTimestamp()
  });

  await batch.commit();
}

export async function submitComment(appId, payload) {
  const name = String(payload.name || "").trim().slice(0, 60);
  const comment = String(payload.comment || "").trim().slice(0, 800);

  if (name.length < 2) throw new Error("Escribe tu nombre.");
  if (comment.length < 5) throw new Error("Escribe un comentario más completo.");

  const commentsRef = collection(db, "apps", appId, "comments");
  await addDoc(commentsRef, {
    name,
    comment,
    approved: false,
    createdAt: serverTimestamp()
  });
}

export async function getApprovedComments(appId) {
  const q = query(
    collection(db, "apps", appId, "comments"),
    where("approved", "==", true)
  );
  const result = await getDocs(q);
  return result.docs
    .map((snapshot) => ({ id: snapshot.id, ...snapshot.data(), createdAtMs: normalizeTimestamp(snapshot.data().createdAt) }))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
}

export async function checkUserInteraction(appId) {
  const clientId = getClientId();
  const [likeSnapshot, ratingSnapshot] = await Promise.all([
    getDoc(doc(db, "apps", appId, "likes", clientId)),
    getDoc(doc(db, "apps", appId, "ratings", clientId))
  ]);

  return {
    liked: likeSnapshot.exists(),
    rated: ratingSnapshot.exists() ? ratingSnapshot.data().rating : null
  };
}
