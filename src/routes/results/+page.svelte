<script>
	import { Loader } from '@googlemaps/js-api-loader';
	import { onMount } from 'svelte';

	const { data } = $props();
	const { apiKey, results } = data;
	let mapElement;

	onMount(() => {
		const loader = new Loader({
			apiKey,
			version: 'weekly'
		});

		loader.load().then(async () => {
			const { Map, InfoWindow } = await google.maps.importLibrary('maps');
			const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

			const map = new Map(mapElement, {
				center: { lat: -29.544072, lng: 23.650699 },
				zoom: 6,
				mapId: 'DEMO_MAP_ID' // Map ID is required for advanced markers.
			});

			results.forEach((result) => {
				if (!result.coords) return;

				const marker = new AdvancedMarkerElement({
					map: map,
					position: { lat: result.coords.latitude, lng: result.coords.longitude },
					title: result.kbps.toFixed(2) + ' kbps'
				});

				// Create the info window content
				const infoWindow = new google.maps.InfoWindow({
					content: `
            <div style="min-width: 120px;">
              <strong>Time:</strong> ${result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}<br>
              <strong>Provider:</strong> ${result.provider ? result.provider : 'N/A'}<br>
              <strong>Passes:</strong> ${result.passes}<br>
              <strong>Speed:</strong> ${result.kbps.toFixed(2)} kbps<br>
              <strong>AveMs:</strong> ${result.avgMs ? result.avgMs.toFixed(2) : 'N/A'} ms<br>
              <strong>Downlink:</strong> ${result.connection && result.connection.downlink ? result.connection.downlink : 'N/A'}<br>
              <strong>Type:</strong> ${result.connection && result.connection.effectiveType ? result.connection.effectiveType : 'N/A'}<br>
              <strong>Device:</strong> ${result.userAgent ? result.userAgent.device.name : 'N/A'}<br>
              <strong>OS:</strong> ${result.userAgent ? result.userAgent.os.name : 'N/A'}<br>
              <strong>Browser:</strong> ${result.userAgent ? result.userAgent.browser.name : 'N/A'}<br>
            </div>
          `
				});

				// Add a click listener to open the info window
				marker.addListener('click', () => {
					infoWindow.open({
						anchor: marker,
						map
					});
				});
			});
		});
	});
</script>

<!-- full page openstreetmap with markers for each result -->
<div class="relative h-screen w-screen">
	<div class="h-full w-full" bind:this={mapElement}></div>
	<a
		href="/"
		class="absolute bottom-6 -left-2 z-100 m-4 w-16 rounded bg-gray-200 p-2 text-center text-gray-700 hover:cursor-pointer hover:bg-gray-300"
		>Back</a
	>
</div>
