import { h, Component } from 'preact';

class Share extends Component {
  constructor() {
    super(...arguments);
    this.mounted = true;
    this.state = { data: null };
    this.props.data.then(data => this.mounted && this.setState({ data }));
  }

  componentWillUnmount() {
    this.mounted = false;
  }

  render() {
    const { data } = this.state;
    if (!data) return 'loading...';
    return (
      <div className="Share">
        <div>{data.link}</div>
        <div>Copy this link!!</div>
      </div>
    );
  }
}
