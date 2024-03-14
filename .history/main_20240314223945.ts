import { Plugin } from 'obsidian';

export default class TimelineBlockPlugin extends Plugin {

	async onload() {

		this.registerMarkdownCodeBlockProcessor("universe-timeline", (source, el, ctx) => {
			const rows = source.split("\n");

			deconstractRows(rows).forEach(event => {
				el.createEl("h1", { text: event.title })
			})
		});

		this.registerMarkdownCodeBlockProcessor("universe-timeline-block", (source, el, ctx) => {
			const rows = source.split("\n");

			let fileName: string = '';
			let keyword: string = '';
			for (let i = 0; i < rows.length; i++) {
				if (rows[i].startsWith("from")) {
					fileName = substringAfter(rows[i], "from ");
				} else if (rows[i].startsWith("filter")) {
					keyword = substringAfter(rows[i], "filter ");
				}
			}
			let file = this.app.vault.getFileByPath(fileName + ".md");
			if (file) {
				this.app.vault.read(file).then(content => {
					deconstractRows(content)
				});
			}

		});
	}

	onunload() {

	}
}

function substringAfter(str: string, separator: string) {
	const index = str.indexOf(separator);
	if (index === -1) {
		return '';
	}
	return str.substring(index + separator.length);
}

/**
 * 解构行文本
 */
function deconstractContent(content: string): Event[] {

	return deconstractRows(content.s)
}

function deconstractRows(rows: string[]): Event[] {
	let events: Event[] = [];

	let tempEvent: Event = new Event();
	for (let i = 0; i < rows.length; i++) {
		let row = rows[i];
		if (row.length == 0 && tempEvent.inited()) {
			events.push(tempEvent);
			tempEvent = new Event();
		} else if (row.startsWith("@title:")) {
			tempEvent.title = substringAfter(row, "@title:");
		} else if (row.startsWith("@type:")) {
			tempEvent.type = substringAfter(row, "@type:");
		} else if (row.startsWith("@date:")) {
			tempEvent.date.push(substringAfter(row, "@date:"));
		} else if (row.startsWith("@member:")) {
			tempEvent.member.push(substringAfter(row, "@member:"));
		} else if (row.startsWith("@tag:")) {
			tempEvent.tag.push(substringAfter(row, "@tag:"));
		} else if (row.startsWith("@content:")) {
			tempEvent.content = substringAfter(row, "@content:");
		}
	}
	if (tempEvent.type) {
		events.push(tempEvent);
	}
	return events;
}

export class Event {

	// 类型
	type: string;
	// 名称
	title: string;
	// 时间
	date: string[] = [];
	// 成员
	member: string[] = [];
	// 时间内容
	content: string;
	// tag
	tag: string[] = [];

	constructor() {

	}

	inited(): boolean {
		return this.type.length > 0 || this.title.length > 0 || this.date.length > 0
			|| this.member.length > 0 || this.content.length > 0 || this.tag.length > 0;
	}
}