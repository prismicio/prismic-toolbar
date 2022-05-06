import { Component } from "preact";

export class ScrollingName extends Component {
	componentDidMount() {
		this.mounted = true;
		const [inner] = this.base.children;
		this.inner = inner;
		this.base.addEventListener("mouseover", this.animate.bind(this));
		this.base.addEventListener("mouseout", this.reset.bind(this));
	}

	animate() {
		if (!this.mounted) {
			return;
		}

		const hiddenWidth = this.inner.scrollWidth - this.inner.offsetWidth;
		const scrollTime = hiddenWidth / 100;

		if (hiddenWidth <= 0) {
			return;
		}
		this.inner.style.transition = `transform ${scrollTime}s linear`;
		this.inner.style.transform = `translateX(-${hiddenWidth}px)`;
	}

	reset() {
		if (!this.mounted) {
			return;
		}

		this.inner.style.transition = "";
		this.inner.style.transform = "";
	}

	componentWillUnmount() {
		this.mounted = false;
	}

	render() {
		const { children, ...other } = this.props;

		return (
			<div {...other}>
				<div>{children}</div>
			</div>
		);
	}
}
