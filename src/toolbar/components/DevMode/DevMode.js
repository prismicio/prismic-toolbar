import "./DevMode.css";
import { Component } from "preact";
import Collapsible from "react-collapsible";
import { stringCheck } from "@common";
import { collapsibleArrow } from ".";
import { JsonView } from "..";

/* ----- BEGINNING OF CLASS ----- */
export class DevMode extends Component {
	constructor(props) {
		super(props);
		this.maxStringSize = props.maxStringSize;
		this.state = { queries: props.queries };
	}

	getGraphqlItemInfo(/* Object */ query) /* : String */ {
		const entries = Object.entries(query);
		const title = entries
			.map((e) => e[0])
			.reduce((acc, val) => acc + " & " + val);

		// return only the title for a graphql query
		return { title };
	}

	/* ----- RETURN TRIGGER INFOS ----- */
	getApiItemInfo = /* Object */ (query) => /* Object */ {
		/*
      expected format of itemInfos
      {
        type1 : ...,
        type2 : ...,
        ...
      }
    */
		const itemInfos = query
			.map((doc) => doc.type)
			.reduce((acc, val) => {
				if (acc[val]) {
					acc[val] += 1;
				} else {
					acc[val] = 1;
				}
				return acc;
			}, {});

		const title = this.constructTitleOfItem(itemInfos);

		// expected format of title : (X) type 1 & (Y) type 2 ...
		const nbLinkedDoc = query
			.map((doc) => this.countLinkedDocInDocument(doc.data))
			.reduce((acc, val) => acc + val);

		// expected to return title and number of linked docs
		return { title, nbLinkedDoc };
	};

	/* ----- CONSTRUCT TITLE BASED ON TYPES AND OCCURRENCES -----*/
	constructTitleOfItem(/* Object */ itemInfos) /* : String */ {
		const copyInfo = Object.assign({}, itemInfos);
		const keys = Object.keys(copyInfo);

		const title = keys
			.map((key) => key + " (" + copyInfo[key] + ")")
			.reduce((acc, val) => acc + " & " + val);

		return title;
	}

	/* ----- RETURN NUMBER OF LINKED DOCUMENT FOR AN API QUERY ----- */
	countLinkedDocInDocument(/* Object */ data) /* : Int */ {
		if (!data) {
			return 0;
		} // First case data is empty or null
		if (data.link_type === "Document" && data.id) {
			return 1;
		} // Second case there is a document, return 1 to increment the count

		// Last case it is an object but not a document, so we check every object inside.
		const count = Object.keys(data).reduce(
			(/* Int */ acc, /* Object || String */ key) => {
				if (typeof data[key] === "object") {
					const newCount = this.countLinkedDocInDocument(data[key]);
					return acc + newCount;
				}
				return acc;
			},
			0,
		);

		return count;
	}

	/* ----- Split the queries into api and graphql queries ----- */
	splitQueries(allQueries) {
		return allQueries.reduce(
			(acc, val) => {
				// apiQuery : [Object] || graphqlQuery : {data: Object}
				if (Object.keys(val).includes("data")) {
					// it's a graphql query
					acc.graphqlApiQueries.push(val);
				} else {
					// it's an api query
					acc.apiQueries.push(val);
				}
				return acc;
			},
			{ apiQueries: [], graphqlApiQueries: [] },
		);
	}

	/* ----- RENDER FUNCTION ----- */
	render() {
		const { queries } = this.state;
		const { apiQueries, graphqlApiQueries } = this.splitQueries(queries);

		return (
			<div>
				{apiQueries.map((query) => {
					// apiQuery : [Object]
					if (Object.keys(query).length < 1) {
						return null;
					}
					const itemInfos = this.getApiItemInfo(query);

					return (
						<Collapsible
							trigger={
								<DevModeItem
									nbLinkedDoc={itemInfos.nbLinkedDoc}
									title={itemInfos.title}
								/>
							}
							triggerWhenOpen={
								<DevModeItem
									isOpen
									nbLinkedDoc={itemInfos.nbLinkedDoc}
									title={itemInfos.title}
								/>
							}
							transitionTime={100}
						>
							{query.map((doc) => (
								<JsonView json={doc} maxStringSize={25} />
							))}
						</Collapsible>
					);
				})}

				{graphqlApiQueries.map((query) => {
					// graphqlQuery : {data: Object}
					if (!query.data || Object.keys(query.data).length < 1) {
						return null;
					}
					const { title } = this.getGraphqlItemInfo(query.data);

					return (
						<Collapsible
							trigger={
								<DevModeItem
									isGraphql
									maxStringSize={this.maxStringSize}
									title={title}
								/>
							}
							triggerWhenOpen={
								<DevModeItem
									isGraphql
									isOpen
									maxStringSize={this.maxStringSize}
									title={title}
								/>
							}
							transitionTime={100}
						>
							{Object.entries(query.data).map(
								(
									e, // e : [ key, value ]
								) => (
									<JsonView
										graphqlUid={e[0]}
										isGraphql
										json={e[1]}
										maxStringSize={this.maxStringSize}
									/>
								),
							)}
						</Collapsible>
					);
				})}
			</div>
		);
	}
}

/* ----- HEADER(TRIGGER) FOR THE COLLAPSIBLE  ----- */
const DevModeItem = ({
	isOpen,
	isGraphql,
	maxStringSize,
	nbLinkedDoc,
	title,
}) => (
	<div className="wrapper-trigger">
		<h2 className="trigger-title"> {stringCheck(title, maxStringSize)} </h2>
		<h3 className="trigger-subtitle">
			{isGraphql ? "[Graphql Query]" : nbLinkedDoc + " linked documents"}
		</h3>
		<img
			className={isOpen ? "trigger-triangle active" : "trigger-triangle"}
			src={collapsibleArrow}
		/>
	</div>
);
