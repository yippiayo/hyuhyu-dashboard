const HYUHYU = (() => {

  // =========================================================
  // HYUHYU API
  // =========================================================

  const API_BASE =
    'https://leaderboard-api-production-64a5.up.railway.app/api';

  const ROBLOX_THUMBNAIL_API =
    'https://thumbnails.roblox.com/v1/users/avatar-headshot';

  let cachedPlayers = [];
  let cachedStats = null;

  const avatarCache = new Map();


  // =========================================================
  // UTILITIES
  // =========================================================

  const escapeHTML = (value = '') =>
    String(value).replace(
      /[&<>'"]/g,
      char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[char])
    );


  // =========================================================
  // AVATAR PLACEHOLDER
  // =========================================================

  const avatarPlaceholder = (playerId = '') => {

    const svg = `
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="150"
        height="150"
        viewBox="0 0 150 150"
      >

        <rect
          width="150"
          height="150"
          rx="28"
          fill="#0b0f16"
        />

        <circle
          cx="75"
          cy="58"
          r="25"
          fill="#f5a623"
        />

        <path
          d="M30 132c5-27 22-42 45-42s40 15 45 42"
          fill="#f5a623"
        />

      </svg>
    `;

    return (
      `data:image/svg+xml;charset=UTF-8,` +
      encodeURIComponent(svg) +
      `#uid=${encodeURIComponent(String(playerId))}`
    );

  };


  // =========================================================
  // FUNGSI INI TETAP DIPAKAI OLEH HALAMAN HTML
  // =========================================================

  const avatarUrl = (playerId) => {

    return avatarPlaceholder(playerId);

  };


  // =========================================================
  // AMBIL PLAYER ID DARI GAMBAR
  // =========================================================

  const getAvatarId = (img) => {

    if (!img) {
      return null;
    }

    if (img.dataset.playerAvatar) {

      return String(
        img.dataset.playerAvatar
      );

    }

    const src =
      img.getAttribute('src') || '';

    const match =
      src.match(/#uid=([^&]+)/);

    if (!match) {
      return null;
    }

    try {

      return decodeURIComponent(
        match[1]
      );

    } catch {

      return match[1];

    }

  };


  // =========================================================
  // REQUEST AVATAR KE ROBLOX
  // =========================================================

  const fetchRobloxAvatar =
    async (playerId) => {

      const id =
        String(
          playerId ?? ''
        ).trim();

      // Roblox User ID harus angka
      if (!/^\d+$/.test(id)) {

        throw new Error(
          'Invalid Roblox User ID'
        );

      }

      // Gunakan cache jika sudah pernah diminta
      if (avatarCache.has(id)) {

        return avatarCache.get(id);

      }

      const avatarPromise = fetch(

        `${ROBLOX_THUMBNAIL_API}` +
        `?userIds=${encodeURIComponent(id)}` +
        `&size=150x150` +
        `&format=Png` +
        `&isCircular=false`,

        {
          method: 'GET',

          headers: {
            Accept: 'application/json'
          }
        }

      )

        .then(response => {

          if (!response.ok) {

            throw new Error(
              `Roblox thumbnail HTTP ${response.status}`
            );

          }

          return response.json();

        })

        .then(result => {

          const item =
            Array.isArray(result?.data)
              ? result.data[0]
              : null;

          if (!item) {

            throw new Error(
              'Roblox avatar not found'
            );

          }

          // Roblox kadang masih membuat thumbnail
          if (
            item.state &&
            item.state !== 'Completed'
          ) {

            throw new Error(
              `Roblox thumbnail state: ${item.state}`
            );

          }

          if (!item.imageUrl) {

            throw new Error(
              'Roblox avatar image unavailable'
            );

          }

          return item.imageUrl;

        })

        .catch(error => {

          // Hapus dari cache agar bisa dicoba ulang
          avatarCache.delete(id);

          throw error;

        });

      avatarCache.set(
        id,
        avatarPromise
      );

      return avatarPromise;

    };


  // =========================================================
  // RESOLVE SATU IMAGE
  // =========================================================

  const resolveRobloxAvatar =
    async (img) => {

      if (
        !(img instanceof HTMLImageElement)
      ) {
        return;
      }

      // Jangan proses ulang jika sudah selesai/loading
      if (
        img.dataset.avatarState === 'loading' ||
        img.dataset.avatarState === 'done'
      ) {
        return;
      }

      const id =
        getAvatarId(img);

      if (!id) {
        return;
      }

      img.dataset.avatarState =
        'loading';

      try {

        const robloxAvatarUrl =
          await fetchRobloxAvatar(id);

        img.src =
          robloxAvatarUrl;

        img.dataset.avatarState =
          'done';

      } catch (error) {

        console.warn(
          `Avatar Roblox gagal dimuat untuk ${id}:`,
          error
        );

        img.src =
          avatarPlaceholder('');

        img.dataset.avatarState =
          'fallback';

      }

    };


  // =========================================================
  // RESOLVE SEMUA AVATAR
  // =========================================================

  const resolveRobloxAvatars =
    (root = document) => {

      if (
        root instanceof HTMLImageElement
      ) {

        resolveRobloxAvatar(root);

      }

      if (
        root &&
        typeof root.querySelectorAll === 'function'
      ) {

        root
          .querySelectorAll('img')
          .forEach(img => {

            resolveRobloxAvatar(img);

          });

      }

    };


  // =========================================================
  // OBSERVER
  // Mendukung card yang dibuat setelah API selesai loading
  // =========================================================

  const observeRobloxAvatars = () => {

    resolveRobloxAvatars(document);

    const observer =
      new MutationObserver(
        mutations => {

          mutations.forEach(
            mutation => {

              mutation
                .addedNodes
                .forEach(node => {

                  if (
                    node.nodeType ===
                    Node.ELEMENT_NODE
                  ) {

                    resolveRobloxAvatars(
                      node
                    );

                  }

                });

            }
          );

        }
      );

    observer.observe(
      document.body,
      {
        childList: true,
        subtree: true
      }
    );

  };


  // =========================================================
  // FORMAT WAKTU
  // =========================================================

  const formatTime = (seconds) => {

    const n =
      Number(seconds);

    if (!Number.isFinite(n)) {

      return '—';

    }

    const mins =
      Math.floor(n / 60);

    const secs =
      n - mins * 60;

    return (
      `${String(mins).padStart(2, '0')}:` +
      `${secs
        .toFixed(2)
        .padStart(5, '0')}`
    );

  };


  // =========================================================
  // FORMAT TANGGAL
  // =========================================================

  const formatDate = (value) => {

    if (!value) {

      return '—';

    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return '—';

    }

    return new Intl.DateTimeFormat(
      'id-ID',
      {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    ).format(date);

  };


  // =========================================================
  // REQUEST API
  // =========================================================

  const request =
    async (
      path,
      options = {}
    ) => {

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () =>
            controller.abort(),
          9000
        );

      try {

        const response =
          await fetch(
            `${API_BASE}${path}`,
            {
              ...options,

              signal:
                controller.signal,

              headers: {

                Accept:
                  'application/json',

                ...(options.headers || {})

              }

            }
          );

        if (!response.ok) {

          throw new Error(
            `HTTP ${response.status}`
          );

        }

        return await response.json();

      } finally {

        clearTimeout(timeout);

      }

    };


  // =========================================================
  // NORMALISASI PLAYER
  // =========================================================

  const normalizePlayer =
    player => ({

      playerId:
        String(
          player.playerId ??
          player.userId ??
          ''
        ),

      username:
        player.username ||
        'Unknown Player',

      bestTime:
        Number(
          player.bestTime
        ),

      totalRace:
        Number(
          player.totalRace ?? 0
        ),

      checkpoint:
        Number(
          player.checkpoint ?? 0
        ),

      updatedAt:
        player.updatedAt ||
        player.lastPlayed ||
        null

    });


  // =========================================================
  // GET PLAYERS
  // =========================================================

  const getPlayers =
    async (force = false) => {

      if (
        cachedPlayers.length &&
        !force
      ) {

        return cachedPlayers;

      }

      const data =
        await request(
          '/leaderboard'
        );

      cachedPlayers =
        (
          Array.isArray(data)
            ? data
            : []
        )

          .map(
            normalizePlayer
          )

          .filter(
            player =>
              Number.isFinite(
                player.bestTime
              )
          )

          .sort(
            (a, b) =>
              a.bestTime -
              b.bestTime
          );

      return cachedPlayers;

    };


  // =========================================================
  // GET STATS
  // =========================================================

  const getStats =
    async (force = false) => {

      if (
        cachedStats &&
        !force
      ) {

        return cachedStats;

      }

      try {

        cachedStats =
          await request(
            '/leaderboard/stats'
          );

        return cachedStats;

      } catch (error) {

        const players =
          await getPlayers(force);

        cachedStats = {

          totalPlayer:
            players.length,

          totalRace:
            players.reduce(
              (
                sum,
                player
              ) =>
                sum +
                (
                  player.totalRace ||
                  0
                ),
              0
            ),

          bestTime:
            players[0]?.bestTime ??
            null,

          checkpoint: 2

        };

        return cachedStats;

      }

    };


  // =========================================================
  // GET PLAYER
  // =========================================================

  const getPlayer =
    async id => {

      try {

        return normalizePlayer(

          await request(

            `/leaderboard/player/${encodeURIComponent(
              id
            )}`

          )

        );

      } catch (error) {

        const players =
          await getPlayers();

        const found =
          players.find(
            player =>
              player.playerId ===
              String(id)
          );

        if (!found) {

          throw error;

        }

        return found;

      }

    };


  // =========================================================
  // API STATUS
  // =========================================================

  const setStatus =
    isOnline => {

      document
        .querySelectorAll(
          '[data-api-status]'
        )
        .forEach(el => {

          el.classList.toggle(
            'online',
            isOnline
          );

          el.classList.toggle(
            'offline',
            !isOnline
          );

          const label =
            el.querySelector(
              '[data-status-label]'
            );

          if (label) {

            label.textContent =
              isOnline
                ? 'API ONLINE'
                : 'API OFFLINE';

          }

        });

    };


  // =========================================================
  // PING API
  // =========================================================

  const ping =
    async () => {

      try {

        await getPlayers(true);

        setStatus(true);

        return true;

      } catch (error) {

        console.warn(
          'HYUHYU API unavailable:',
          error
        );

        setStatus(false);

        return false;

      }

    };


  // =========================================================
  // ACTIVE NAVIGATION
  // =========================================================

  const activeNav = () => {

    const current =
      location.pathname
        .split('/')
        .pop() ||
      'index.html';

    document
      .querySelectorAll(
        '[data-nav]'
      )
      .forEach(link => {

        link.classList.toggle(
          'active',
          link.getAttribute(
            'href'
          ) === current
        );

      });

  };


  // =========================================================
  // FOOTER YEAR
  // =========================================================

  const renderFooterYear = () => {

    document
      .querySelectorAll(
        '[data-year]'
      )
      .forEach(
        el =>
          el.textContent =
            new Date().getFullYear()
      );

  };


  // =========================================================
  // NUMBER ANIMATION
  // =========================================================

  const animateNumber =
    (
      el,
      value
    ) => {

      const target =
        Number(value);

      if (
        !Number.isFinite(target)
      ) {

        el.textContent = '—';

        return;

      }

      const duration = 650;

      const start =
        performance.now();

      const from = 0;

      const step =
        now => {

          const progress =
            Math.min(
              (
                now -
                start
              ) /
              duration,
              1
            );

          const eased =
            1 -
            Math.pow(
              1 -
              progress,
              3
            );

          el.textContent =
            Math.round(
              from +
              (
                target -
                from
              ) *
              eased
            ).toLocaleString(
              'id-ID'
            );

          if (
            progress < 1
          ) {

            requestAnimationFrame(
              step
            );

          }

        };

      requestAnimationFrame(
        step
      );

    };


  // =========================================================
  // DOM READY
  // =========================================================

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      activeNav();

      renderFooterYear();

      observeRobloxAvatars();

    }
  );


  // =========================================================
  // PUBLIC FUNCTIONS
  // =========================================================

  return {

    API_BASE,

    avatarUrl,

    fetchRobloxAvatar,

    resolveRobloxAvatars,

    formatTime,

    formatDate,

    escapeHTML,

    getPlayers,

    getStats,

    getPlayer,

    setStatus,

    ping,

    animateNumber

  };

})();
