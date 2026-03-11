const STORAGE_KEY = "dsync_state_v1";
const channel = new BroadcastChannel("dsync-live-comments");

const state = {
  user: null,
  driveConnected: false,
  videos: [],
  activeVideoId: null,
};

const el = {
  googleSignInBtn: document.getElementById("googleSignInBtn"),
  userProfile: document.getElementById("userProfile"),
  connectDriveBtn: document.getElementById("connectDriveBtn"),
  driveStatus: document.getElementById("driveStatus"),
  uploadForm: document.getElementById("uploadForm"),
  videoTitle: document.getElementById("videoTitle"),
  videoFile: document.getElementById("videoFile"),
  videoUrl: document.getElementById("videoUrl"),
  videoList: document.getElementById("videoList"),
  reviewVideo: document.getElementById("reviewVideo"),
  activeVideoBadge: document.getElementById("activeVideoBadge"),
  commentList: document.getElementById("commentList"),
  addCommentBtn: document.getElementById("addCommentBtn"),
  guestName: document.getElementById("guestName"),
  guestEmail: document.getElementById("guestEmail"),
  commentText: document.getElementById("commentText"),
  shareLink: document.getElementById("shareLink"),
  copyLinkBtn: document.getElementById("copyLinkBtn"),
  timelineMarkers: document.getElementById("timelineMarkers"),
  progressBadge: document.getElementById("progressBadge"),
  topbarStats: document.getElementById("topbarStats"),
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return;
  try {
    const parsed = JSON.parse(data);
    Object.assign(state, parsed);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function fakeGoogleSignIn() {
  state.user = {
    name: "Creator Workspace",
    email: "creator@googleuser.com",
  };
  saveState();
  renderAuth();
}

function connectDrive() {
  if (!state.user) {
    alert("Please sign in with Google first.");
    return;
  }
  state.driveConnected = true;
  saveState();
  renderDriveStatus();
}

function createVideo({ title, source }) {
  const id = crypto.randomUUID();
  const secureToken = crypto.randomUUID().replace(/-/g, "");
  return {
    id,
    title,
    source,
    drivePath: state.driveConnected ? `GoogleDrive:/Dsync/${title}` : "Local preview",
    shareToken: secureToken,
    createdAt: new Date().toISOString(),
    comments: [],
    status: "pending",
  };
}

function getActiveVideo() {
  return state.videos.find((video) => video.id === state.activeVideoId) || null;
}

function setActiveVideo(videoId) {
  state.activeVideoId = videoId;
  const active = getActiveVideo();

  if (!active) {
    el.reviewVideo.removeAttribute("src");
    el.activeVideoBadge.textContent = "No video selected";
    el.shareLink.value = "";
    renderComments();
    return;
  }

  el.reviewVideo.src = active.source;
  el.activeVideoBadge.textContent = `${active.title} • ${active.status}`;
  el.shareLink.value = `${window.location.origin}${window.location.pathname}?review=${active.shareToken}`;
  renderComments();
  renderTimelineMarkers();
}

function renderAuth() {
  if (!state.user) {
    el.userProfile.classList.add("hidden");
    return;
  }
  el.userProfile.classList.remove("hidden");
  el.userProfile.textContent = `${state.user.name} (${state.user.email})`;
}

function renderDriveStatus() {
  el.driveStatus.textContent = state.driveConnected
    ? "Drive connected • uploads stored to Google Drive"
    : "Drive not connected";
}

function renderVideos() {
  el.videoList.innerHTML = "";
  for (const video of state.videos) {
    const li = document.createElement("li");
    li.className = "video-item";
    li.innerHTML = `<strong>${video.title}</strong><br/><small>${video.drivePath}</small>`;

    const btn = document.createElement("button");
    btn.className = "secondary-btn";
    btn.textContent = "Open";
    btn.addEventListener("click", () => {
      setActiveVideo(video.id);
      saveState();
      updateMetrics();
    });

    li.appendChild(btn);
    el.videoList.appendChild(li);
  }
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function renderComments() {
  const active = getActiveVideo();
  el.commentList.innerHTML = "";
  if (!active) return;

  for (const comment of active.comments) {
    const li = document.createElement("li");
    li.className = "comment-item";
    li.innerHTML = `
      <strong>${comment.name}</strong> <small>(${comment.email})</small>
      <div>${comment.message}</div>
      <small>@ ${formatTime(comment.timestamp)}</small>
    `;
    li.addEventListener("click", () => {
      el.reviewVideo.currentTime = comment.timestamp;
      el.reviewVideo.play();
    });
    el.commentList.appendChild(li);
  }

  active.status = active.comments.length > 0 ? "in_review" : "pending";
  el.progressBadge.textContent = `${Math.min(active.comments.length * 20, 100)}% reviewed`;
}

function renderTimelineMarkers() {
  const active = getActiveVideo();
  el.timelineMarkers.innerHTML = "";
  if (!active || !el.reviewVideo.duration) return;

  for (const comment of active.comments) {
    const dot = document.createElement("span");
    dot.className = "marker";
    const progress = (comment.timestamp / el.reviewVideo.duration) * 100;
    dot.style.left = `${Math.min(progress, 99)}%`;
    el.timelineMarkers.appendChild(dot);
  }
}

function updateMetrics() {
  const totalComments = state.videos.reduce((sum, video) => sum + video.comments.length, 0);
  el.topbarStats.textContent = `${state.videos.length} videos • ${totalComments} comments • Realtime sync on`;
}

function addComment() {
  const active = getActiveVideo();
  if (!active) return alert("Select a video first.");

  const name = el.guestName.value.trim();
  const email = el.guestEmail.value.trim();
  const message = el.commentText.value.trim();

  if (!name || !email || !message) {
    return alert("Guest name, email, and comment are required.");
  }

  const comment = {
    id: crypto.randomUUID(),
    name,
    email,
    message,
    timestamp: Math.floor(el.reviewVideo.currentTime || 0),
    createdAt: new Date().toISOString(),
  };

  active.comments.push(comment);
  saveState();
  renderComments();
  renderTimelineMarkers();
  updateMetrics();

  channel.postMessage({ type: "new-comment", activeVideoId: state.activeVideoId, comment });

  el.commentText.value = "";
}

function uploadVideo(event) {
  event.preventDefault();

  if (!state.user) {
    return alert("Please sign in with Google before uploading.");
  }

  const title = el.videoTitle.value.trim();
  const file = el.videoFile.files[0];
  const directUrl = el.videoUrl.value.trim();

  if (!title || (!file && !directUrl)) {
    return alert("Add a title and either upload a file or provide a video URL.");
  }

  const source = file ? URL.createObjectURL(file) : directUrl;
  const video = createVideo({ title, source });
  state.videos.unshift(video);
  saveState();

  renderVideos();
  setActiveVideo(video.id);
  updateMetrics();

  el.uploadForm.reset();
}

function copyShareLink() {
  if (!el.shareLink.value) return;
  navigator.clipboard.writeText(el.shareLink.value);
  el.copyLinkBtn.textContent = "Copied";
  setTimeout(() => (el.copyLinkBtn.textContent = "Copy review link"), 1200);
}

function activateSharedVideoIfPresent() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("review");
  if (!token) return;

  const match = state.videos.find((video) => video.shareToken === token);
  if (match) {
    setActiveVideo(match.id);
  }
}

function initializeRealtime() {
  channel.onmessage = ({ data }) => {
    if (!data || data.type !== "new-comment") return;
    if (data.activeVideoId !== state.activeVideoId) return;
    renderComments();
    renderTimelineMarkers();
    updateMetrics();
  };
}

function init() {
  loadState();
  renderAuth();
  renderDriveStatus();
  renderVideos();
  updateMetrics();

  if (state.activeVideoId) {
    setActiveVideo(state.activeVideoId);
  }

  activateSharedVideoIfPresent();
  initializeRealtime();

  el.googleSignInBtn.addEventListener("click", fakeGoogleSignIn);
  el.connectDriveBtn.addEventListener("click", connectDrive);
  el.uploadForm.addEventListener("submit", uploadVideo);
  el.addCommentBtn.addEventListener("click", addComment);
  el.copyLinkBtn.addEventListener("click", copyShareLink);

  el.reviewVideo.addEventListener("loadedmetadata", renderTimelineMarkers);
}

init();
