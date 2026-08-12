const HYUHYU = (() => {

  // =========================================================
  // CONFIGURATION
  // =========================================================

  const API_BASE =
    'https://leaderboard-api-production-64a5.up.railway.app/api';

  let cachedPlayers = [];
  let cachedStats = null;


  // =========================================================
  // ESCAPE HTML
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
  // ROBLOX AVATAR
  // Avatar diambil melalui backend Railway
  // untuk menghindari masalah CORS.
  //
  // type:
  // headshot
  // bust
  // full
  // =========================================================

  const avatarUrl = (
    playerId,
    type = 'headshot'
  ) => {

    const id =
      encodeURIComponent(
        String(playerId || '')
      );

    const avatarType =
      encodeURIComponent(
        String(type || 'headshot')
      );

    return (
      `${API_BASE}/avatar/` +
      `${id}` +
      `?type=${avatarType}`
    );

  };


  // =========================================================
  // QUICKSORT
  // =========================================================
  //
  // Implementasi QuickSort menggunakan pivot tengah.
  //
  // Fungsi ini bekerja secara in-place pada array.
  //
  // Comparator:
  // < 0 = a sebelum b
  // > 0 = a sesudah b
  // = 0 = sama
  //
  // =========================================================

  const quickSort = (
    array,
    compare,
    left = 0,
    right = array.length - 1
  ) => {

    // Jika bukan array
    if (!Array.isArray(array)) {
      return [];
    }


    // Array kosong / satu elemen
    if (
      array.length <= 1 ||
      left >= right
    ) {

      return array;

    }


    let i = left;
    let j = right;


    // Pivot menggunakan elemen tengah
    const pivot =
      array[
        Math.floor(
          (left + right) / 2
        )
      ];


    // =====================================================
    // PARTITION
    // =====================================================

    while (i <= j) {

      while (
        compare(
          array[i],
          pivot
        ) < 0
      ) {

        i++;

      }


      while (
        compare(
          array[j],
          pivot
        ) > 0
      ) {

        j--;

      }


      if (i <= j) {

        const temp =
          array[i];

        array[i] =
          array[j];

        array[j] =
          temp;


        i++;
        j--;

      }

    }


    // =====================================================
    // REKURSIF BAGIAN KIRI
    // =====================================================

    if (left < j) {

      quickSort(
        array,
        compare,
        left,
        j
      );

    }


    // =====================================================
    // REKURSIF BAGIAN KANAN
    // =====================================================

    if (i < right) {

      quickSort(
        array,
        compare,
        i,
        right
      );

    }


    return array;

  };


  // =========================================================
  // QUICKSORT UNTUK PLAYER
  // bestTime terkecil = peringkat lebih tinggi
  // =========================================================

  const sortPlayersByBestTime =
    players => {

      if (!Array.isArray(players)) {
        return [];
      }


      // Copy array agar data asli
      // tidak dimodifikasi langsung.
      const result =
        [...players];


      quickSort(
        result,

        (a, b) => {

          const timeA =
            Number(a.bestTime);

          const timeB =
            Number(b.bestTime);


          // ===============================================
          // DATA INVALID
          // ===============================================

          if (
            !Number.isFinite(timeA) &&
            !Number.isFinite(timeB)
          ) {

            return 0;

          }


          if (
            !Number.isFinite(timeA)
          ) {

            return 1;

          }


          if (
            !Number.isFinite(timeB)
          ) {

            return -1;

          }


          // ===============================================
          // BEST TIME
          // ===============================================

          if (timeA < timeB) {
            return -1;
          }


          if (timeA > timeB) {
            return 1;
          }


          // ===============================================
          // JIKA WAKTU SAMA
          // gunakan username agar hasil deterministik
          // ===============================================

          return String(
            a.username || ''
          ).localeCompare(
            String(
              b.username || ''
            )
          );

        }

      );


      return result;

    };


  // =========================================================
  // QUICKSORT ANGKA
  // Dipakai untuk Boundary Testing
  //
  // Contoh:
  // HYUHYU.quickSortNumbers([5,3,1,4,2])
  //
  // Output:
  // [1,2,3,4,5]
  // =========================================================

  const quickSortNumbers =
    values => {

      if (!Array.isArray(values)) {
        return [];
      }


      const result =
        values.map(
          value =>
            Number(value)
        );


      quickSort(
        result,
        (a, b) =>
          a - b
      );


      return result;

    };


  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime =
    seconds => {

      const n =
        Number(seconds);


      if (
        !Number.isFinite(n)
      ) {

        return '—';

      }


      const mins =
        Math.floor(
          n / 60
        );


      const secs =
        n -
        mins * 60;


      return (
        `${String(mins)
          .padStart(2, '0')}:` +

        `${secs
          .toFixed(2)
          .padStart(5, '0')}`
      );

    };


  // =========================================================
  // FORMAT DATE
  // =========================================================

  const formatDate =
    value => {

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


      return new Intl
        .DateTimeFormat(
          'id-ID',
          {

            day:
              '2-digit',

            month:
              'short',

            year:
              'numeric',

            hour:
              '2-digit',

            minute:
              '2-digit'

          }
        )
        .format(date);

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

                ...(
                  options.headers ||
                  {}
                )

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

        clearTimeout(
          timeout
        );

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
          player.totalRace ??
          0
        ),

      checkpoint:
        Number(
          player.checkpoint ??
          0
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
    async (
      force = false
    ) => {

      // Gunakan cache
      if (
        cachedPlayers.length &&
        !force
      ) {

        return cachedPlayers;

      }


      // Request leaderboard
      const data =
        await request(
          '/leaderboard'
        );


      // Normalisasi data
      const normalized =
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
          );


      // =====================================================
      // QUICKSORT LEADERBOARD
      // =====================================================

      cachedPlayers =
        sortPlayersByBestTime(
          normalized
        );


      return cachedPlayers;

    };


  // =========================================================
  // GET STATS
  // =========================================================

  const getStats =
    async (
      force = false
    ) => {

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


        // ===============================================
        // FALLBACK STATS
        // ===============================================

        const players =
          await getPlayers(
            force
          );


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

          checkpoint:
            2

        };


        return cachedStats;

      }

    };


  // =========================================================
  // GET ONE PLAYER
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


        // ===============================================
        // FALLBACK DARI CACHE LEADERBOARD
        // ===============================================

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
        .forEach(
          element => {

            element
              .classList
              .toggle(
                'online',
                isOnline
              );


            element
              .classList
              .toggle(
                'offline',
                !isOnline
              );


            const label =
              element
                .querySelector(
                  '[data-status-label]'
                );


            if (label) {

              label.textContent =
                isOnline
                  ? 'API ONLINE'
                  : 'API OFFLINE';

            }

          }
        );

    };


  // =========================================================
  // PING API
  // =========================================================

  const ping =
    async () => {

      try {

        await getPlayers(
          true
        );


        setStatus(
          true
        );


        return true;


      } catch (error) {


        console.warn(
          'HYUHYU API unavailable:',
          error
        );


        setStatus(
          false
        );


        return false;

      }

    };


  // =========================================================
  // ACTIVE NAVIGATION
  // =========================================================

  const activeNav =
    () => {

      const current =
        location.pathname
          .split('/')
          .pop() ||
        'index.html';


      document
        .querySelectorAll(
          '[data-nav]'
        )
        .forEach(
          link => {

            link
              .classList
              .toggle(

                'active',

                link.getAttribute(
                  'href'
                ) === current

              );

          }
        );

    };


  // =========================================================
  // FOOTER YEAR
  // =========================================================

  const renderFooterYear =
    () => {

      document
        .querySelectorAll(
          '[data-year]'
        )
        .forEach(
          element => {

            element.textContent =
              new Date()
                .getFullYear();

          }
        );

    };


  // =========================================================
  // NUMBER ANIMATION
  // =========================================================

  const animateNumber =
    (
      element,
      value
    ) => {

      const target =
        Number(value);


      if (
        !Number.isFinite(
          target
        )
      ) {

        element.textContent =
          '—';

        return;

      }


      const duration =
        650;


      const start =
        performance.now();


      const from =
        0;


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


          element.textContent =
            Math.round(

              from +

              (
                target -
                from
              ) *

              eased

            )
              .toLocaleString(
                'id-ID'
              );


          if (
            progress <
            1
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

    }
  );


  // =========================================================
  // PUBLIC FUNCTIONS
  // =========================================================

  return {

    // API
    API_BASE,

    // Avatar
    avatarUrl,

    // QuickSort
    quickSort,
    quickSortNumbers,
    sortPlayersByBestTime,

    // Utilities
    formatTime,
    formatDate,
    escapeHTML,

    // Data
    getPlayers,
    getStats,
    getPlayer,

    // UI
    setStatus,
    ping,
    animateNumber

  };

})();
