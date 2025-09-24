<script>
	import { UAParser } from 'ua-parser-js';
	import { fade } from 'svelte/transition';
	import { probeNetwork, saveResult, getGeoCoordinates, fetchJson } from '$lib';
	import logo from '$lib/assets/favicon.png';

	// create and store deviceID in localStorage if not exists
	const deviceID = localStorage.getItem('vppro-patchy-deviceID');
	if (!deviceID) {
		const newID = crypto.randomUUID();
		localStorage.setItem('vppro-patchy-deviceID', newID);
	}

	const { browser, os, device } = UAParser(navigator.userAgent);

	let provider = $state('');
	let lastResult = $state(null);
	let fetching = $state(false);
	let saving = $state(false);
	let saved = $state(false);

	provider = localStorage.getItem('vppro-patchy-provider');
	console.log('Initial provider:', provider);

	let infoDialog;

	function handleProviderChange(event) {
		localStorage.setItem('vppro-patchy-provider', provider);
	}

	async function testNetwork() {
		const testStart = performance.now();
		saved = false;
		const to = setTimeout(() => {
			fetching = true;
		}, 100);

		const [coords, result] = await Promise.all([getGeoCoordinates(), probeNetwork('/ping')]).catch(
			(e) => {
				console.error('Error during network test:', e);
				return [null, null];
			}
		);

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
			result.provider = provider || 'not selected';

			const testEnd = performance.now();
			result.testDurationMs = Math.round(testEnd - testStart);

			lastResult = result;
		}

		clearTimeout(to);
		fetching = false;
	}

	const save = async () => {
		if (!lastResult) return;
		saving = true;
		try {
			await saveResult(lastResult);
		} catch (e) {
			console.error('Error saving result:', e);
			alert('Error saving result: ' + e.message);
			saving = false;
			return;
		}
		saving = false;
		saved = true;
		lastResult = null;
		setTimeout(() => (saved = false), 1000);
	};

	const showInfo = () => {
		infoDialog.showModal();
	};
</script>

<main class="flex h-screen w-screen flex-col items-center justify-center gap-4">
	<div class="relative m-auto flex h-full flex-col items-center justify-center gap-4 p-8">
		<button
			class="absolute top-5 right-5 text-gray-400 hover:cursor-pointer"
			aria-label="info-button"
			onclick={showInfo}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				height="24px"
				viewBox="0 -960 960 960"
				width="24px"
				fill="currentColor"
				><path
					d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"
				/></svg
			>
		</button>
		<div class="relative">
			<img class="absolute -top-5 -right-6 h-16 w-16" src={logo} alt="app icon" />
			<h1 class="text-3xl text-gray-500">Lets test the network!</h1>
			<select
				name="provider"
				id="provider"
				placeholder="Select your provider"
				bind:value={provider}
				onchange={handleProviderChange}
				class="mt-4 w-full rounded border border-gray-300 p-2"
				class:text-gray-400={!provider}
			>
				<option value="" class="text-gray-400">Select your provider</option>
				<option value="vodacom" class="text-gray-800">Vodacom</option>
				<option value="mtn" class="text-gray-800">MTN</option>
				<option value="cell-c" class="text-gray-800">Cell C</option>
				<option value="telkom" class="text-gray-800">Telkom</option>
				<option value="rain" class="text-gray-800">Rain</option>
				<option value="fibre-wifi" class="text-gray-800">Fibre Wifi</option>
				<option value="other" class="text-gray-800">Other / Unknown</option>
			</select>
			<div class="flex min-h-36 flex-col items-center justify-center">
				{#if lastResult}
					{#if lastResult.avgMs == Infinity}
						<p class="text-lg font-bold text-amber-400">Failed to connect</p>
					{:else}
						<p class="text-lg">Connected: {lastResult.passes ? 'yes' : 'no'}</p>
						<p class="text-lg">
							Latency: {lastResult.avgMs == Infinity ? '~ ' : Math.round(lastResult.avgMs)}ms
						</p>
						<p class="text-lg">Speed: {Math.round(lastResult.kbps)}KB/s</p>
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
						class="w-72 rounded bg-blue-500 p-2 text-xl font-bold text-white hover:cursor-pointer hover:bg-blue-400 disabled:cursor-not-allowed disabled:bg-gray-300"
						disabled={!provider}
						onclick={testNetwork}>TEST</button
					>
				{/if}
			</div>
			<div class="flex min-h-16 flex-col items-center justify-center">
				{#if saving}
					<p class="text-gray-400">Saving result...</p>
				{:else}
					<button
						class="w-72 rounded bg-green-500 p-2 text-xl font-bold text-white hover:cursor-pointer hover:bg-green-400"
						class:invisible={!lastResult}
						onclick={save}>Save result</button
					>
				{/if}
			</div>
			<div class="flex h-16 justify-center">
				{#if saved}
					<p class="mt-2 text-gray-500" out:fade>Saved!</p>
				{/if}
			</div>
		</div>
	</div>
</main>
<dialog
	bind:this={infoDialog}
	class="m-auto w-full rounded border border-gray-300 bg-white p-4 text-gray-600 shadow-lg md:w-1/2 lg:w-1/3"
>
	<h2 class="mb-2 text-xl font-bold">Collecting Connectivity Data</h2>
	<p class="mb-4">
		Click the <span class="font-bold text-blue-900">TEST</span> button, if there is a connection the
		app will send a short request to a server located in Google's Johannesburg data center and measure
		the response time and download speed. You can then save the result, which will be stored anonymously.
		Do this in areas with poor/borderline connectivity. The data will be used to help design apps that
		work better in patchy network conditions.
	</p>
	<h3 class="text-lg font-semibold">Location Access</h3>
	<p class="mb-4">
		The first time you click <span class="font-bold text-blue-900">TEST</span> your browser will ask
		for permission to access your location. Please grant this permission , as the location data is important
		to map connectivity in different areas.
	</p>
	<h3 class="text-lg font-semibold">Privacy</h3>
	<p class="mb-4">
		The app will not store any personal data other than your location, internet provider, and some
		details about the device such as the operating system and browser being used.
	</p>
	<h3 class="text-lg font-semibold">Code</h3>
	<p class="mb-4">
		The source code for is available on
		<a
			href="https://github.com/enviro-insight/patchy-network-tester"
			target="_blank"
			rel="noopener noreferrer"
			class="text-blue-500 underline hover:text-blue-400">GitHub</a
		>. Feel free to suggest improvements there under the Issues tab!
	</p>
	<button
		class="mt-2 rounded bg-blue-500 p-2 text-white hover:cursor-pointer hover:bg-blue-400"
		onclick={() => infoDialog.close()}>Close</button
	>
</dialog>
