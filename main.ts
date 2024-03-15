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
				if (rows[i].startsWith("from")) {
					fileName = substringAfter(rows[i], "from ");
				} else if (rows[i].startsWith("filter")) {
					keyword = substringAfter(rows[i], "filter ");
				}
			}
			console.log(fileName, keyword)
			if (keyword) {
				timelineBlock.createDiv({ cls: "timeline-title", text: `${keyword} from ${fileName}` })
			} else {
				timelineBlock.createDiv({ cls: "timeline-title", text: `all from ${fileName}` })
			}

			let file = this.app.vault.getFileByPath(fileName + ".md");
			if (file) {
				this.app.vault.read(file).then(content => {
					let events = deconstractContent(content);
					events.forEach(event => event.memberDraw());
					console.log(events);
					if (keyword?.length > 0) {
						events = events.filter(event => event.content?.contains(keyword));
						console.log(events);
					}
					if (events?.length == 0) {
						timelineBlock.createEl("h1", { text: "event not found" })
					} else {
						events.forEach(event => {
							let timelineLine = timelineBlock.createDiv({ cls: "timeline-line" });
							
							let timelineLineTime = timelineLine.createDiv({ cls: "timeline-line-time"})
							MarkdownRenderer.render(this.app, event.date, timelineLineTime, fileName, this)

							let timelineLineContent = timelineLine.createDiv({ cls: "timeline-line-content" })
							MarkdownRenderer.render(this.app, event.content, timelineLineContent, fileName, this);
						})
					}
				});
			} else {
				timelineBlock.createEl("h1", { text: "file not found" })
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
		console.log(`target = ${target} str = ${str}`)
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
		} else if (row.startsWith("#背景")) {
			tempEvent.background = substringAfter(row, "#背景");
		} else {
			if (tempEvent.content.length > 0) {
				tempEvent.content += `\n${row}`;
			} else {
				tempEvent.content += `${row}`;
			}
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
	// 背景
	background: string;
	// 成员
	member: string[] = [];
	// 事件内容
	content: string = '';

	constructor() {

	}

	inited(): boolean {
		return this.date != null
			|| this.member?.length > 0 || this.content?.length > 0;
	}

	memberDraw() {
		console.log(`原始 content: ${this.content}`);
		if (this.content.contains("[[") && this.content.contains("]]")) {
			console.log(`包含引用的 content: ${this.content}`);
			substringBetweenAll(this.content, "[[", "]]").forEach(member => {
				this.member.push(member);
			})
		}
	}
}