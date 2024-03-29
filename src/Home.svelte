<script lang="ts">
	import { _ } from "./i18n";
	import { aboutPath, signupPath } from "./router/routes";
	import { isSignupEnabled } from "./store";
	import { Link } from "svelte-navigator";
	import { repoFile, repoMain, repoNewIssue } from "./platformMeta";
	import ActionButton from "./components/buttons/ActionButton.svelte";
	import EncryptionIcon from "./icons/Lock.svelte";
	import I18N from "./components/I18N.svelte";
	import LedgerIcon from "./icons/MoneyTower.svelte";
	import OpenSourceIcon from "./icons/IdeaBox.svelte";
	import OutLink from "./components/OutLink.svelte";

	const aboutRoute = aboutPath();
	const signupRoute = signupPath();
</script>

<main class="content">
	<h1 class="tagline">{$_("home.tagline")}</h1>

	<!-- Get started now -->
	<aside class="tagline">
		<Link to={aboutRoute} class="link">
			<ActionButton kind={isSignupEnabled ? "secondary" : "primary"}
				>{$_("common.learn-more")}</ActionButton
			>
		</Link>
		{#if isSignupEnabled}
			<Link to={signupRoute} class="link">
				<ActionButton>{$_("home.sign-up-now")}</ActionButton>
			</Link>
		{:else}
			<Link to={aboutRoute} class="link">
				<ActionButton kind="secondary">{$_("home.coming-soon")}</ActionButton>
			</Link>
		{/if}
	</aside>

	<!-- Your money, where it's been -->
	<section id="ledger">
		<LedgerIcon />
		<h3>{$_("home.accountability.heading")}</h3>
		<p>
			<I18N keypath="home.accountability.p1">
				<!-- tool -->
				<Link to={aboutRoute}>{$_("home.accountability.tool")}</Link>
			</I18N>
		</p>
	</section>

	<!-- E2E Encrypted -->
	<section id="encrypted">
		<EncryptionIcon />
		<h3>{$_("home.encrypted.heading")}</h3>
		<p>
			<I18N keypath="home.encrypted.p1">
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- legal -->
				<small>
					<I18N keypath="home.encrypted.legal">
						<!-- not -->
						<em>{$_("home.encrypted.not")}</em>
					</I18N>
				</small>
			</I18N>
		</p>
	</section>

	<!-- Open-source and Free -->
	<section id="open-source">
		<OpenSourceIcon />
		<h3>{$_("home.open-source.heading")}</h3>
		<p>
			{$_("home.open-source.open")}
			<I18N keypath="home.open-source.pr">
				<!-- issue -->
				<OutLink to={repoNewIssue}>{$_("home.open-source.issue")}</OutLink>
				<!-- codeberg -->
				<OutLink to={repoMain}>{$_("home.open-source.codeberg")}</OutLink>
			</I18N>
			{$_("home.open-source.let-me-know")}
		</p>
	</section>

	<!-- How we work, why JS -->
	<section id="how-we-work">
		<p>
			<I18N keypath="home.how-we-work.p">
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- spa -->
				<OutLink to="https://developer.mozilla.org/en-US/docs/Glossary/SPA"
					>{$_("home.how-we-work.spa")}</OutLink
				>
				<!-- read -->
				<OutLink to={repoFile("src/workers/cryptionWorker.ts")}
					>{$_("home.how-we-work.read")}</OutLink
				>
			</I18N>
		</p>
	</section>
</main>
