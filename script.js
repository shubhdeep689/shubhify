console.log('Let’s write JavaScript');

let currentSong = new Audio();
let songs = [];
let currFolder;
let currentTrackIndex = 0;

// Convert seconds to MM:SS format
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) return "00:00";
    const m = String(Math.floor(seconds / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    return `${m}:${s}`;
}

// Load songs from selected album folder
async function getSongs(folder) {
    currFolder = folder;
    let res;

    try {
        res = await fetch(`${folder}/`);
        if (!res.ok) throw new Error(`Failed to fetch folder: ${folder}`);
    } catch (err) {
        console.error("Fetch error:", err);
        return [];
    }

    const html = await res.text();
    const div = document.createElement("div");
    div.innerHTML = html;
    const links = div.getElementsByTagName("a");

    songs = [];
    for (let link of links) {
        if (link.href.endsWith(".mp3")) {
            songs.push(link.href.split(`${folder}/`)[1]);
        }
    }

    const songUL = document.querySelector(".songList ul");
    songUL.innerHTML = "";

    songs.forEach((song, index) => {
        songUL.innerHTML += `
            <li>
                <img class="invert music" width="34" src="img/music.svg" alt="music">
                <div class="info">
                    <div>${decodeURIComponent(song)}</div>
                    <div>SHUBH</div>
                </div>
                <div class="playnow">
                    <img class="invert" width="24" src="img/play.svg" alt="play now">
                </div>
            </li>`;
    });

    Array.from(songUL.children).forEach((li, i) => {
        li.addEventListener("click", () => {
            currentTrackIndex = i;
            playMusic(songs[currentTrackIndex]);
        });
    });

    return songs;
}

// Play selected song and update UI
function playMusic(track, pause = false) {
    currentSong.src = `${currFolder}/${track}`;
    
    if (!pause) currentSong.play();

    const playBtn = document.querySelector("#play");
    playBtn.src = pause ? "img/play.svg" : "img/pause.svg";

    document.querySelector(".songinfo").innerText = decodeURIComponent(track);
    document.querySelector(".songtime").innerText = "00:00 / 00:00";
}

// Display all albums dynamically
async function displayAlbums() {
    let res;

    try {
        res = await fetch("songs/");
        if (!res.ok) throw new Error("Failed to fetch albums");
    } catch (err) {
        console.error("Fetch error:", err);
        return;
    }

    const html = await res.text();
    const div = document.createElement("div");
    div.innerHTML = html;
    const anchors = Array.from(div.getElementsByTagName("a"));
    const cardContainer = document.querySelector(".card-container");

    for (let a of anchors) {
        if (a.href.includes("songs/") && !a.href.includes(".htaccess")) {
            const folder = a.href.split("/").slice(-2)[0];

            try {
                const meta = await fetch(`songs/${folder}/info.json`);
                if (!meta.ok) continue;
                const data = await meta.json();

                cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">
                        <div class="play">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                xmlns="http://www.w3.org/2000/svg">
                                <path d="M5 20V4L19 12L5 20Z" stroke="#141B34" fill="#000" stroke-width="1.5"
                                    stroke-linejoin="round" />
                            </svg>
                        </div>
                        <img src="songs/${folder}/cover.jpg" alt="">
                        <h2>${data.title}</h2>
                        <p>${data.description}</p>
                    </div>`;
            } catch (err) {
                console.warn("Could not load album info for", folder);
            }
        }
    }

    document.querySelectorAll(".card").forEach(card => {
        card.addEventListener("click", async () => {
            songs = await getSongs(`songs/${card.dataset.folder}`);
            if (songs.length > 0) {
                currentTrackIndex = 0;
                playMusic(songs[currentTrackIndex]);
            }
        });
    });
}

// Entry point
async function main() {
    const playBtn = document.querySelector("#play");
    const prevBtn = document.querySelector("#prev");
    const nextBtn = document.querySelector("#next");

    songs = await getSongs("songs/ncs");
    if (songs.length > 0) {
        currentTrackIndex = 0;
        playMusic(songs[currentTrackIndex], true);
    }

    await displayAlbums();

    // Play/Pause toggle
    playBtn.addEventListener("click", () => {
        if (currentSong.paused) {
            currentSong.play();
            playBtn.src = "img/pause.svg";
        } else {
            currentSong.pause();
            playBtn.src = "img/play.svg";
        }
    });

    // Previous button
    prevBtn.addEventListener("click", () => {
        if (currentTrackIndex > 0) {
            currentTrackIndex--;
            playMusic(songs[currentTrackIndex]);
        }
    });

    // Next button
    nextBtn.addEventListener("click", () => {
        if (currentTrackIndex + 1 < songs.length) {
            currentTrackIndex++;
            playMusic(songs[currentTrackIndex]);
        }
    });

    // Auto play next song when one ends
    currentSong.addEventListener("ended", () => {
        if (currentTrackIndex + 1 < songs.length) {
            currentTrackIndex++;
            playMusic(songs[currentTrackIndex]);
        }
    });

    // Time update
    currentSong.addEventListener("timeupdate", () => {
        document.querySelector(".songtime").innerText =
            `${secondsToMinutesSeconds(currentSong.currentTime)} / ${secondsToMinutesSeconds(currentSong.duration)}`;
        document.querySelector(".circle").style.left =
            (currentSong.currentTime / currentSong.duration) * 100 + "%";
    });

    // Seekbar click
    document.querySelector(".seekbar").addEventListener("click", e => {
        const percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = (currentSong.duration * percent) / 100;
    });

    // Navigation hamburger
    document.querySelector(".hamburger")?.addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    document.querySelector(".close")?.addEventListener("click", () => {
        document.querySelector(".left").style.left = "-200%";
    });

    // Volume slider
    const rangeInput = document.querySelector(".range input");
    rangeInput.addEventListener("input", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
        if (currentSong.volume > 0)
            document.querySelector(".volume img").src = "img/volume.svg";
    });

    // Mute/Unmute button
    document.querySelector(".volume img").addEventListener("click", e => {
        const img = e.target;
        if (img.src.includes("volume.svg")) {
            img.src = "img/mute.svg";
            currentSong.volume = 0;
            rangeInput.value = 0;
        } else {
            img.src = "img/volume.svg";
            currentSong.volume = 0.1;
            rangeInput.value = 10;
        }
    });
}

// Run when DOM is ready
document.addEventListener("DOMContentLoaded", main);
