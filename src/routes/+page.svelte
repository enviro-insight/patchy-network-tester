<script>
	import { UAParser } from 'ua-parser-js';
	import { fade } from 'svelte/transition';
	import { probeNetwork, saveResult, getGeoCoordinates } from '$lib';
	import logo from '$lib/assets/favicon.svg';

	// create and store deviceID in localStorage if not exists
	const deviceID = localStorage.getItem('vppro-patchy-deviceID');
	if (!deviceID) {
		const newID = crypto.randomUUID();
		localStorage.setItem('vppro-patchy-deviceID', newID);
	}

	const { browser, os, device } = UAParser(navigator.userAgent);

	let lastResult = $state(null);
	let fetching = $state(false);
	let saved = $state(false);

	async function testNetwork() {
		saved = false;
		const to = setTimeout(() => {
			fetching = true;
		}, 100);

		const [coords, result] = await Promise.all([
			getGeoCoordinates(),
			probeNetwork('/api/healthz')
		]).catch((e) => {
			console.error('Error during network test:', e);
			return [null, null];
		});

		if (coords && result) {
			result.timestamp = new Date().toISOString();
			const { latitude, longitude, accuracy } = coords;
			result.coords = {
				latitude,
				longitude,
				accuracy
			};

			if ('connection' in navigator) {
				const conn = navigator.connection;
				const { downlink, effectiveType, rtt, saveData, type = 'unknown' } = conn;
				result.connection = { downlink, effectiveType, rtt, saveData, type };
			} else {
				result.connection = {};
			}

			result.userAgent = {
				browser,
				os,
				device
			};

			result.deviceID = deviceID;

			lastResult = result;
		}

		clearTimeout(to);
		fetching = false;
	}

	const save = async () => {
		if (!lastResult) return;
		await saveResult(lastResult);
		saved = true;
		lastResult = null;
		setTimeout(() => (saved = false), 1000);
	};
</script>

<main class="flex h-screen w-screen flex-col items-center justify-center gap-4">
	<div
		class="flex h-4/5 flex-col items-center justify-center rounded-lg border border-gray-300 px-8"
	>
		<img src={logo} alt="app icon" />
		<h1 class="text-3xl text-gray-500">Lets test the network!</h1>
		<div class="flex min-h-36 flex-col items-center justify-center">
			{#if lastResult}
				{#if lastResult.avgMs == Infinity}
					<p class="text-lg font-bold text-amber-400">Failed to connect</p>
				{:else}
					<p class="text-lg">Connected: {lastResult.passes ? 'yes' : 'no'}</p>
					<p class="text-lg">
						Latency: {lastResult.avgMs == Infinity ? '~ ' : Math.round(lastResult.avgMs)}ms
					</p>
					<p class="text-lg">Speed: {Math.round(lastResult.kbps)}Kbps</p>
				{/if}
			{:else}
				<p class="text-gray-400">Waiting for a result</p>
			{/if}
		</div>

		<div class="flex min-h-16 flex-col items-center justify-center">
			{#if fetching}
				<p class="text-gray-400">one moment please...</p>
			{:else}
				<button
					class="w-72 rounded bg-blue-500 p-2 text-xl font-bold text-white hover:cursor-pointer hover:bg-blue-400"
					onclick={testNetwork}>TEST</button
				>
			{/if}
		</div>
		<button
			class="w-72 rounded bg-green-500 p-2 text-xl font-bold text-white hover:cursor-pointer hover:bg-green-400"
			class:invisible={!lastResult}
			onclick={save}>Save result</button
		>
		<div class="flex h-32 justify-center">
			{#if saved}
				<p class="mt-2 text-gray-500" out:fade>Saved!</p>
			{/if}
		</div>
	</div>
</main>
