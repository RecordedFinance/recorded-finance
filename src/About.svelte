<script lang="ts">
	import { _ } from "./i18n";
	import I18N from "./components/I18N.svelte";
	import OutLink from "./components/OutLink.svelte";
</script>

<main class="content">
	<section>
		<h1 id="goals">{$_("about.goals.heading")}</h1>
		<p>
			<I18N keypath="about.goals.p1">
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- selfhost -->
				<OutLink to="https://en.wikipedia.org/wiki/Self-hosting_(web_services)"
					>{$_("about.goals.selfhost")}</OutLink
				>
				<!-- opensource -->
				<OutLink to="https://en.wikipedia.org/wiki/Open-source_software"
					>{$_("about.goals.opensource")}</OutLink
				>
				<!-- platform -->
				<span>{$_("common.platform")}</span>
				<!-- platform -->
				<span>{$_("common.platform")}</span>
			</I18N>
		</p>
	</section>

	<section>
		<h1 id="alternatives">{$_("about.alternatives.heading")}</h1>
		<p>
			<I18N keypath="about.alternatives.p1">
				<!-- alts -->
				<OutLink to="https://opensource.com/life/17/10/personal-finance-tools-linux"
					>{$_("about.alternatives.alts")}</OutLink
				>
			</I18N>
		</p>
		<ul>
			<li>
				<I18N keypath="about.alternatives.alt1" tag="p">
					<!-- ynab -->
					<OutLink to="https://www.youneedabudget.com">{$_("about.alternatives.ynab")}</OutLink>
				</I18N>
			</li>

			<!-- TODO: Add https://copilot.money -->
			<!-- TODO: Add https://gnucash.org -->

			<li>
				<I18N keypath="about.alternatives.alt2" tag="p">
					<!-- intuit -->
					<OutLink to="https://www.intuit.com">{$_("about.alternatives.intuit")}</OutLink>
					<!-- mint -->
					<OutLink to="https://mint.intuit.com">{$_("about.alternatives.mint")}</OutLink>
					<!-- turbotax -->
					<OutLink to="https://turbotax.intuit.com">{$_("about.alternatives.turbotax")}</OutLink>
				</I18N>
			</li>

			<li>
				<I18N keypath="about.alternatives.alt3" tag="p">
					<!-- ramsey -->
					<OutLink to="https://www.ramseysolutions.com/">{$_("about.alternatives.ramsey")}</OutLink>
					<!-- everydollar -->
					<OutLink to="https://www.ramseysolutions.com/ramseyplus/everydollar"
						>{$_("about.alternatives.everydollar")}</OutLink
					>
				</I18N>
			</li>

			<li>
				<I18N keypath="about.alternatives.alt4" tag="p">
					<!-- others -->
					<OutLink to="https://www.nerdwallet.com/article/finance/best-budget-apps"
						>{$_("about.alternatives.others")}</OutLink
					>
				</I18N>
			</li>
		</ul>

		<p>
			<I18N keypath="about.alternatives.open-source">
				<!-- opensource -->
				<OutLink to="https://en.wikipedia.org/wiki/Open-source_software"
					>{$_("about.alternatives.opensource")}</OutLink
				>
				<!-- e2ee -->
				<OutLink to="https://en.wikipedia.org/wiki/End-to-end_encryption"
					>{$_("about.alternatives.e2ee")}</OutLink
				>
			</I18N>
		</p>
		<p>{$_("about.alternatives.summary")}</p>
	</section>
	<!-- TODO: Reorganize. Mention https://www.budgetwithbuckets.com/ -->

	<!-- TODO: Recorded Finance's Goal. Above mentions business model... what's ours? -->
	<!-- TODO: About the "team" -->
</main>

<style lang="scss">
	ul {
		max-width: 38em;
		padding-left: 16pt;
		list-style: circle;
	}

	ul li {
		margin-bottom: 16pt;
	}
</style>
