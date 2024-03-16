import { Plugin, MarkdownRenderer } from 'obsidian';
// import * as yaml from 'js-yaml';
// import { TimelineEvent } from 'event/event';

export default class TimelineBlockPlugin extends Plugin {

	async onload() {
		this.registerMarkdownCodeBlockProcessor("universe-timeline-block", (source, el, ctx) => {
			const rows = source.split("\n");
			let timelineBlock = el.createDiv({ cls: "timeline-block" });

			let fileName: string = '';
			let keyword: string = '';
			for (let i = 0; i < rows.length; i++) {
				if (rows[i].startsWith("from ")) {
					fileName = substringAfter(rows[i], "from ");
					fileName = extractStr(fileName);
				} else if (rows[i].startsWith("keyword ")) {
					keyword = substringAfter(rows[i], "keyword ");
					keyword = extractStr(keyword);
				}
			}
			if (keyword) {
				timelineBlock.createDiv({ cls: "timeline-title", text: `${keyword} from "${fileName}"` })
			} else {
				timelineBlock.createDiv({ cls: "timeline-title", text: `all from ${fileName}` })
			}

			let file = this.app.vault.getFileByPath(fileName + ".md");
			if (file) {
				this.app.vault.read(file).then(content => {
					let events = deconstractContent(content);
					events.forEach(event => event.selfComplete());
					events.sort((a, b) => {
						if (a.year != b.year) {
							return a.year - b.year;
						} else {
							if (a.month != b.month) {
								return a.month - b.month;
							} else {
								return a.day - b.day;
							}
						}
					})

					if (keyword.length > 0) {
						events = events.filter(event => event.content.some(row => row.contains(keyword)));
					}

					if (events?.length == 0) {
						timelineBlock.createSpan({ text: "event not found" })
					} else {
						events.forEach(event => {
							let timelineLine = timelineBlock.createDiv({ cls: "timeline-row" });

							let timelineLineTime = timelineLine.createDiv({ cls: "timeline-row-time" })
							// MarkdownRenderer.render(this.app, `[[${substringAfterLast(fileName, "/")}#${event.date}]]`, timelineLineTime, fileName, this)
							MarkdownRenderer.render(this.app, `${event.date}`, timelineLineTime, fileName, this)
							// timelineLineTime.onClickEvent(event => {
							// 	console.log(event);
							// })

							let timelineLineContent = timelineLine.createDiv({ cls: "timeline-row-content" })
							if (event.background.length > 0) {
								let backgroundTag = event.background.map(i => `#${i}`).join(" ");
								MarkdownRenderer.render(this.app, `${backgroundTag}`, timelineLineContent, fileName, this);
							}
							MarkdownRenderer.render(this.app, event.content.filter(row => row.contains(keyword)).map(r => `${r}`).join("\n"), timelineLineContent, fileName, this);
						})
					}
				});
			} else {
				timelineBlock.createSpan({ text: "file not found" })
			}

		});
		// this.registerMarkdownCodeBlockProcessor("universe-timeline-yaml", (source, el, ctx) => {
		// 	try {
		// 		// Tab 转 四空格
		// 		source = source.split("	").join("    ");
		// 		const events: TimelineEvent[] = yaml.load(source) as TimelineEvent[];
		// 		console.log(events);

		// 		events.sort((a, b) => a.startTime - b.startTime);

		// 		if (events.length == 0) {
		// 			el.createSpan({ text: "nothing to show" });
		// 		} else {
		// 			events.forEach(event => {
		// 				console.log(event);
		// 				el.createDiv("<br/>");
		// 				const timelineBlock = el.createDiv({ cls: "timeline-block" });
		// 				timelineBlock.createDiv({ cls: "timeline-event-name", text: event.name });
		// 				timelineBlock.createDiv({ cls: "timeline-event-time", text: event.startTime + ' - ' + event.endTime });
		// 				timelineBlock.createDiv({ cls: "timeline-event-content", text: event.content });
		// 			})
		// 		}
		// 	} catch (error) {
		// 		el.createEl("h1", { text: error })
		// 	}
		// });
	}

	onunload() {

	}

}

function extractStr(str: string): string {
	if (str.startsWith("\"") && str.endsWith("\"")) {
		str = substringBetween(str, "\"", "\"");
	} else if (str.startsWith("'") && str.endsWith("'")) {
		str = substringBetween(str, "'", "'");
	}
	return str;
}

function substringAfterLast(str: string, separator: string) {
	const lastIndex = str.lastIndexOf(separator);
	if (lastIndex === -1) {
		return str;
	}
	return str.substring(lastIndex + separator.length);
}

function substringAfter(str: string, separator: string) {
	const index = str.indexOf(separator);
	if (index === -1) {
		return '';
	}
	return str.substring(index + separator.length);
}

function substringBetweenAll(str: string, start: string, end: string): string[] {
	const results: string[] = [];
	let startIndex: number = str.indexOf(start);
	let endIndex: number;

	while (str.contains(start) && str.contains(end)) {
		let target = substringBetween(str, start, end);
		results.push(target);
		str = substringAfter(str, `${start}${target}${end}`);
	}

	return results;
}
function substringBetween(str: string, start: string, end: string): string {
	const startIndex = str.indexOf(start) + start.length;
	const endIndex = str.indexOf(end, startIndex);
	if (startIndex === -1 || endIndex === -1) {
		return '';
	}
	return str.substring(startIndex, endIndex);
}

function deconstractContent(content: string): Event[] {
	return deconstractRows(content.split("\n"));
}

/**
 * 解构行文本
 */
function deconstractRows(rows: string[]): Event[] {
	let events: Event[] = [];

	let tempEvent: Event = new Event();
	for (let i = 0; i < rows.length; i++) {
		let row = rows[i];
		if (row.startsWith("# ")) {
			if (tempEvent.inited()) {
				events.push(tempEvent);
				tempEvent = new Event();
			}
			let time = substringAfter(row, "# ");
			tempEvent.date = Number.isNumber(time) ? Number.parseInt(time) + "" : time;
		} else if (row.startsWith("#")) {
			tempEvent.background.push(substringAfter(row, "#"));
		} else {
			if (!tempEvent.inited()) {
				continue;
			}
			tempEvent.content.push(row);
		}
	}
	if (tempEvent.inited()) {
		events.push(tempEvent);
	}
	return events;
}

export class Event {

	// 时间
	date: string;

	year: number = 999999;
	month: number = 1;
	day: number = 1;

	// 背景
	background: string[] = [];

	// 事件内容
	content: string[] = [];

	constructor() {

	}

	inited(): boolean {
		return this.date != null;
	}

	selfComplete() {
		// 日期转化
		this.date = this.date?.trim() ?? '';
		if (/\d{1,8}(.0?[1-9]|1[0-2])?(.0?[1-9]|[1-2][0-9]|3[0-1])?/.test(this.date)) {
			let split = this.date.split(".");
			switch (split.length) {
				case 3:
					this.day = Number.parseInt(split[2]);
				case 2:
					this.month = Number.parseInt(split[1]);
				case 1:
					this.year = Number.parseInt(split[0]);
			}
		}
	}
}