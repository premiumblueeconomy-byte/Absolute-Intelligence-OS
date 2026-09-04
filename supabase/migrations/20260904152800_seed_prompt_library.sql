-- Prompt Library seed — the 50 flagship prompts from the product spec,
-- each tagged with the agent chain its workflow should run (section 33:
-- "prompt -> workflow", not a raw pass-through to the model).

insert into public.prompt_templates (prompt_number, category, template, workflow) values
-- Resource Discovery
(1, 'Resource Discovery', 'Analyze [RESOURCE] in [LOCATION] and identify its components, useful properties, transformation pathways, products, markets, waste streams and the 20 highest-potential business opportunities.', array['reality_agent','resource_agent','science_agent','evidence_agent','technology_agent','market_agent','opportunity_agent','risk_agent','strategy_agent','integrator_agent']),
(2, 'Resource Discovery', 'Take [AGRICULTURAL PRODUCT] and construct a complete value cascade from farm production to high-value industrial products.', array['resource_agent','technology_agent','market_agent','opportunity_agent','integrator_agent']),
(3, 'Resource Discovery', 'Identify everything currently treated as waste in the [INDUSTRY] value chain and show which streams could become commercially useful products.', array['systems_agent','resource_agent','opportunity_agent','market_agent','integrator_agent']),
(4, 'Resource Discovery', 'Analyze [MATERIAL] at molecular, functional, industrial and commercial levels and identify unconventional applications.', array['science_agent','resource_agent','technology_agent','opportunity_agent','integrator_agent']),
(5, 'Resource Discovery', 'Find 25 products that could theoretically or commercially be produced from [RESOURCE], and classify them as established, emerging or speculative.', array['resource_agent','technology_agent','evidence_agent','opportunity_agent','integrator_agent']),
(6, 'Resource Discovery', 'Map the industrial ecosystem that could be built around [RESOURCE] within [COUNTRY].', array['systems_agent','resource_agent','market_agent','strategy_agent','integrator_agent']),
(7, 'Resource Discovery', 'Identify underutilized resources in [LOCATION] that could support new industries.', array['reality_agent','resource_agent','opportunity_agent','integrator_agent']),
(8, 'Resource Discovery', 'Compare raw export of [RESOURCE] with five value-added alternatives and determine where the greatest economic value could be captured.', array['resource_agent','financial_agent','market_agent','strategy_agent','integrator_agent']),
(9, 'Resource Discovery', 'Identify adjacent industries that become possible once [COUNTRY/COMPANY] develops capability in [PROCESS/TECHNOLOGY].', array['technology_agent','systems_agent','opportunity_agent','integrator_agent']),
(10, 'Resource Discovery', 'Transform [WASTE STREAM] into an opportunity tree showing energy, materials, chemicals, agricultural and environmental applications.', array['resource_agent','technology_agent','opportunity_agent','risk_agent','integrator_agent']),
-- Problem Intelligence
(11, 'Problem Intelligence', 'Analyze [PROBLEM] as a system. Identify root causes, actors, incentives, feedback loops, constraints and intervention points.', array['reality_agent','systems_agent','causal_agent','integrator_agent']),
(12, 'Problem Intelligence', 'Turn [PROBLEM] into a portfolio of 20 entrepreneurial opportunities.', array['systems_agent','causal_agent','opportunity_agent','strategy_agent','integrator_agent']),
(13, 'Problem Intelligence', 'Identify hidden economic opportunities created by solving [SOCIAL OR ENVIRONMENTAL PROBLEM].', array['systems_agent','opportunity_agent','market_agent','integrator_agent']),
(14, 'Problem Intelligence', 'Explain why previous attempts to solve [PROBLEM] may have failed and identify alternative intervention strategies.', array['reality_agent','causal_agent','risk_agent','strategy_agent','integrator_agent']),
(15, 'Problem Intelligence', 'Map first-, second- and third-order consequences of [POLICY OR INTERVENTION].', array['systems_agent','causal_agent','foresight_agent','integrator_agent']),
-- Market Intelligence
(16, 'Market Intelligence', 'Analyze the global market for [PRODUCT] and identify attractive customer segments, applications, regions and entry opportunities.', array['market_agent','evidence_agent','opportunity_agent','integrator_agent']),
(17, 'Market Intelligence', 'Identify products imported by [COUNTRY] that could plausibly be manufactured from locally available resources.', array['market_agent','resource_agent','financial_agent','integrator_agent']),
(18, 'Market Intelligence', 'Map the customer ecosystem for [PRODUCT], including buyers, distributors, specifications and purchasing criteria.', array['market_agent','systems_agent','integrator_agent']),
(19, 'Market Intelligence', 'Compare [PRODUCT A] and [PRODUCT B] according to market attractiveness, margins, technology difficulty, capital intensity and strategic value.', array['market_agent','technology_agent','financial_agent','strategy_agent','integrator_agent']),
(20, 'Market Intelligence', 'Identify underserved niches in [INDUSTRY] that new entrants could attack.', array['market_agent','opportunity_agent','strategy_agent','integrator_agent']),
-- Technology Intelligence
(21, 'Technology Intelligence', 'Analyze [TECHNOLOGY], explain how it works, assess technology readiness, identify leading applications and reveal 20 potential uses.', array['science_agent','technology_agent','evidence_agent','opportunity_agent','integrator_agent']),
(22, 'Technology Intelligence', 'Identify technologies from unrelated industries that could be transferred into [INDUSTRY] to solve major problems.', array['technology_agent','systems_agent','opportunity_agent','integrator_agent']),
(23, 'Technology Intelligence', 'Compare five technologies capable of transforming [INPUT] into [PRODUCT] including yield, energy use, CAPEX, complexity and scalability.', array['technology_agent','financial_agent','strategy_agent','integrator_agent']),
(24, 'Technology Intelligence', 'Identify emerging technologies that could disrupt [INDUSTRY] within the next ten years.', array['technology_agent','foresight_agent','risk_agent','integrator_agent']),
(25, 'Technology Intelligence', 'Determine which technological capabilities [COUNTRY] must develop to enter [VALUE CHAIN].', array['technology_agent','strategy_agent','integrator_agent']),
-- Research Intelligence
(26, 'Research Intelligence', 'Analyze this research paper and identify the scientific finding, commercial applications, missing experiments, potential products and commercialization pathway.', array['science_agent','evidence_agent','opportunity_agent','execution_agent','integrator_agent']),
(27, 'Research Intelligence', 'Review research on [SUBJECT] and identify findings that appear scientifically promising but commercially underexploited.', array['science_agent','market_agent','opportunity_agent','integrator_agent']),
(28, 'Research Intelligence', 'Convert this university research project into a prototype, pilot and startup pathway.', array['technology_agent','opportunity_agent','execution_agent','integrator_agent']),
(29, 'Research Intelligence', 'Identify intellectual property opportunities emerging from research into [TOPIC].', array['science_agent','strategy_agent','integrator_agent']),
(30, 'Research Intelligence', 'Identify the research questions that must be answered before [TECHNOLOGY OR PRODUCT] can become commercially viable.', array['science_agent','risk_agent','integrator_agent']),
-- Business Creation
(31, 'Business Creation', 'Build an Opportunity Genome for [OPPORTUNITY], including customers, technology, feedstock, competition, CAPEX, OPEX, revenue, risks and validation requirements.', array['opportunity_agent','market_agent','technology_agent','financial_agent','risk_agent','integrator_agent']),
(32, 'Business Creation', 'Design a minimum viable pilot for [BUSINESS IDEA] that tests the most dangerous assumptions before major capital investment.', array['risk_agent','execution_agent','integrator_agent']),
(33, 'Business Creation', 'Create low-capital, medium-capital and industrial-scale commercial models for monetizing [RESOURCE OR TECHNOLOGY].', array['financial_agent','strategy_agent','integrator_agent']),
(34, 'Business Creation', 'Identify ten ways this company could create new revenue from existing assets, waste streams, knowledge and customer relationships.', array['opportunity_agent','market_agent','strategy_agent','integrator_agent']),
(35, 'Business Creation', 'Build an industrial cluster around [ANCHOR PRODUCT] and identify businesses that could supply or consume one another''s outputs.', array['systems_agent','opportunity_agent','strategy_agent','integrator_agent']),
-- Investment Intelligence
(36, 'Investment Intelligence', 'Evaluate [BUSINESS OR PROJECT] as an investor. Identify investment thesis, assumptions, economics, risks, competitive advantage and reasons not to invest.', array['financial_agent','risk_agent','strategy_agent','integrator_agent']),
(37, 'Investment Intelligence', 'Score these opportunities using market attractiveness, resource security, technology readiness, capital requirement, strategic value and execution difficulty.', array['opportunity_agent','strategy_agent','integrator_agent']),
(38, 'Investment Intelligence', 'Stress-test this business under adverse scenarios involving feedstock prices, exchange rates, energy costs and selling prices.', array['financial_agent','foresight_agent','risk_agent','integrator_agent']),
(39, 'Investment Intelligence', 'Identify the five assumptions most capable of destroying this investment case and propose experiments to test each one.', array['risk_agent','execution_agent','integrator_agent']),
(40, 'Investment Intelligence', 'Compare investing [CAPITAL] across these opportunities and rank them according to risk-adjusted strategic return.', array['financial_agent','strategy_agent','integrator_agent']),
-- Strategy and Foresight
(41, 'Strategy and Foresight', 'Create four scenarios for the future of [INDUSTRY OR COUNTRY] through [YEAR] and identify opportunities unique to each scenario.', array['foresight_agent','opportunity_agent','integrator_agent']),
(42, 'Strategy and Foresight', 'Identify weak signals today that could become major opportunities or threats in [SECTOR] within ten years.', array['foresight_agent','risk_agent','integrator_agent']),
(43, 'Strategy and Foresight', 'What would have to become true for [AMBITION] to succeed? Construct the complete dependency map.', array['systems_agent','causal_agent','strategy_agent','integrator_agent']),
(44, 'Strategy and Foresight', 'Develop a strategic roadmap for [COUNTRY OR COMPANY] to move from raw-material production toward high-value manufacturing.', array['strategy_agent','execution_agent','integrator_agent']),
(45, 'Strategy and Foresight', 'Identify 20 globally strategic value chains that [COUNTRY] could realistically enter and rank them.', array['market_agent','strategy_agent','integrator_agent']),
-- Absolute Intelligence
(46, 'Absolute Intelligence', 'Do not simply answer my question. Reframe it, identify what I may be missing, expose hidden assumptions and determine the deeper question I should be asking.', array['reality_agent','risk_agent','integrator_agent']),
(47, 'Absolute Intelligence', 'Analyze [SUBJECT] through scientific, economic, technological, ecological, geopolitical, cultural and systems perspectives, then integrate the findings.', array['science_agent','financial_agent','technology_agent','systems_agent','integrator_agent']),
(48, 'Absolute Intelligence', 'Find unexpected relationships between [SUBJECT A] and at least five apparently unrelated industries that could create opportunities.', array['systems_agent','opportunity_agent','integrator_agent']),
(49, 'Absolute Intelligence', 'Attempt to disprove this idea: [IDEA]. Attack its technology, economics, assumptions, market, regulation and execution model, then show what could make it stronger.', array['risk_agent','financial_agent','technology_agent','integrator_agent']),
(50, 'Absolute Intelligence', 'Apply the full Absolute Intelligence process to [SUBJECT]: establish reality, assess evidence, map causality, model the system, discover possibilities, rank opportunities, identify risks, design experiments and produce a 12-month execution roadmap.', array['reality_agent','evidence_agent','causal_agent','systems_agent','opportunity_agent','risk_agent','execution_agent','integrator_agent']);
