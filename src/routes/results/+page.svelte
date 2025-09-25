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
			const { Map } = await google.maps.importLibrary('maps');
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
