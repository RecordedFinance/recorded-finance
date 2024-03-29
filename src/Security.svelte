<script lang="ts">
	import { _ } from "./i18n";
	import { repoFile } from "./platformMeta";
	import I18N from "./components/I18N.svelte";
	import OutLink from "./components/OutLink.svelte";
</script>

<main class="content">
	<!-- FIXME: This document is a draft. I think it's pretty close to what we actually do, but I need to proofread it again. Please take everything here with a grain of *salt* ;) -->

	<section>
		<h1>{$_("security-faq.heading")}</h1>
		<p>
			<I18N keypath="security-faq.summary">
				<!-- tldr -->
				<strong>{$_("security-faq.tldr")}</strong>
			</I18N>
		</p>
	</section>

	<!-- What kind of encryption? -->
	<section>
		<h2
			>{$_("security-faq.encryption-kind.question", {
				values: { platform: $_("common.platform") },
			})}</h2
		>
		<p>
			<I18N keypath="security-faq.encryption-kind.answer">
				<!-- mge -->
				<OutLink to="https://en.wikipedia.org/wiki/Advanced_Encryption_Standard"
					>{$_("security-faq.encryption-kind.mge")}</OutLink
				>
			</I18N>
		</p>
	</section>

	<!-- Who does encryption? Who has keys? -->
	<section>
		<h2>{$_("security-faq.where-keys.question")}</h2>
		<p>{$_("security-faq.where-keys.answer1")}</p>
		<p>
			<I18N keypath="security-faq.where-keys.answer2">
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- dek -->
				<em>{$_("security-faq.where-keys.dek")}</em>
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- kek -->
				<em>{$_("security-faq.where-keys.kek")}</em>
				<!-- platform -->
				<span>{$_("common.platform")}</span>
			</I18N>
		</p>
		<p>
			<I18N keypath="security-faq.where-keys.answer3">
				<!-- sha512 -->
				<OutLink to="https://en.wikipedia.org/wiki/SHA-2"
					>{$_("security-faq.where-keys.sha512")}</OutLink
				>
				<!-- pbkdf2 -->
				<OutLink to="https://en.wikipedia.org/wiki/PBKDF2"
					>{$_("security-faq.where-keys.pbkdf2")}</OutLink
				>
				<!-- source -->
				<OutLink to={repoFile("src/transport/cryptionProtocols.ts")}
					>{$_("security-faq.where-keys.source")}</OutLink
				>
			</I18N>
		</p>
	</section>

	<!-- Auth: What about my password? -->
	<section>
		<h2
			>{$_("security-faq.passphrase-handling.question", {
				values: { platform: $_("common.platform") },
			})}</h2
		>
		<p
			>{$_("security-faq.passphrase-handling.answer1", {
				values: { platform: $_("common.platform") },
			})}</p
		>
		<p>
			<I18N keypath="security-faq.passphrase-handling.answer2">
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- salts -->
				<OutLink to="https://en.wikipedia.org/wiki/Salt_(cryptography)"
					>{$_("security-faq.passphrase-handling.salts")}</OutLink
				>
				<!-- hashes -->
				<OutLink to="https://en.wikipedia.org/wiki/Cryptographic_hash_function"
					>{$_("security-faq.passphrase-handling.hashes")}</OutLink
				>
			</I18N>
		</p>
		<p
			>{$_("security-faq.passphrase-handling.answer3", {
				values: { platform: $_("common.platform") },
			})}</p
		>
		<p>
			<I18N keypath="security-faq.passphrase-handling.answer4">
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- dek -->
				<em>{$_("security-faq.passphrase-handling.dek")}</em>
			</I18N>
		</p>
		<p>
			<I18N keypath="security-faq.passphrase-handling.answer5">
				<!-- sha512 -->
				<OutLink to="https://en.wikipedia.org/wiki/SHA-2"
					>{$_("security-faq.passphrase-handling.sha512")}</OutLink
				>
				<!-- bcrypt -->
				<OutLink to="https://www.npmjs.com/package/bcrypt"
					>{$_("security-faq.passphrase-handling.bcrypt")}</OutLink
				>
				<!-- source -->
				<OutLink to={repoFile("server/auth/index.ts")}
					>{$_("security-faq.passphrase-handling.source")}</OutLink
				>
			</I18N>
		</p>
	</section>

	<!-- Password change -->
	<section>
		<h2>{$_("security-faq.change-passphrase.question")}</h2>
		<p>{$_("security-faq.change-passphrase.answer1")}</p>
		<p
			>{$_("security-faq.change-passphrase.answer2", {
				values: { platform: $_("common.platform") },
			})}</p
		>
		<p>{$_("security-faq.change-passphrase.answer3")}</p>
	</section>

	<!-- Password loss -->
	<section>
		<h2>{$_("security-faq.lost-passphrase.question")}</h2>
		<p>{$_("security-faq.lost-passphrase.answer1")}</p>
		<p>
			<OutLink to="https://bitwarden.com">{$_("security-faq.lost-passphrase.answer2")}</OutLink>
		</p>
	</section>

	<!-- Database loss -->
	<section>
		<h2>{$_("security-faq.database-breach.question")}</h2>
		<p>{$_("security-faq.database-breach.answer1")}</p>
	</section>

	<!-- Report vulnerabilities -->
	<section>
		<h2>{$_("security-faq.report-vuln.question")}</h2>
		<p>
			<I18N keypath="security-faq.report-vuln.answer">
				<!-- sec-txt -->
				<OutLink to="/.well-known/security.txt">{$_("security-faq.report-vuln.sec-txt")}</OutLink>
			</I18N>
		</p>
	</section>
</main>
