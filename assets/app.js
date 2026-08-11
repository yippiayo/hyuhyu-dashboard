const HYUHYU = (() => {

  const API_BASE =
    'https://leaderboard-api-production-64a5.up.railway.app/api';

  let cachedPlayers = [];
  let cachedStats = null;


  // =========================================================
  // UTILITIES
  // =========================================================

  const escapeHTML = (value = '') =>
    String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));


  // =========================================================
  // ROBLOX AVATAR
  // Sekarang melalui backend Railway
  // =========================================================

  const avatarUrl = (playerId, type = 'headshot') => {

    const id =
      encodeURIComponent(
        String(playerId || '')
      );

    const avatarType =
      encodeURIComponent(type);

    return `${API_BASE}/avatar/${id}?type=${avatarType}`;

  };


  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (seconds) => {

    const n = Number(seconds);

    if (!Number.isFinite(n)) {
      return '—';
    }

    const mins =
      Math.floor(n / 60);

    const secs =
      n - mins * 60;

    return (
      `${String(mins).padStart(2, '0')}:` +
      `${secs.toFixed(2).padStart(5, '0')}`
    );

  };


  // =========================================================
  // FORMAT DATE
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
    async (path, options = {}) => {

      const controller =
        new AbortController();

      const timeout =
        setTimeout(
          () => controller.abort(),
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
  // NORMALIZE PLAYER
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

          .map(normalizePlayer)

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
              (sum, player) =>
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
            `/leaderboard/player/${encodeURIComponent(id)}`
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
  // ACTIVE NAV
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
  // FOOTER
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
    (el, value) => {

      const target =
        Number(value);

      if (!Number.isFinite(target)) {

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
              (now - start) /
              duration,
              1
            );

          const eased =
            1 -
            Math.pow(
              1 - progress,
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

          if (progress < 1) {

            requestAnimationFrame(
              step
            );

          }

        };

      requestAnimationFrame(step);

    };


  // =========================================================
  // DOM READY
  // =========================================================

  document.addEventListener(
    'DOMContentLoaded',
    () => {

      activeNav();
      renderFooterYear();

    }
  );


  // =========================================================
  // PUBLIC
  // =========================================================

  return {

    API_BASE,

    avatarUrl,

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
