using System.Collections.Concurrent;
using System.Threading.Channels;

using Jvedio.Contracts.Common;

namespace Jvedio.Worker.Services;

public sealed class WorkerEventStreamBroker
{
    private readonly ConcurrentDictionary<Guid, Channel<WorkerEventEnvelopeDto>> subscriptions = new();

    public WorkerEventEnvelopeDto CreateEnvelope(string eventName, string topic, object? data)
    {
        return new WorkerEventEnvelopeDto
        {
            Data = data,
            EventId = $"evt_{Guid.NewGuid():N}",
            EventName = eventName,
            OccurredAtUtc = DateTimeOffset.UtcNow,
            Topic = topic,
        };
    }

    public void Publish(string eventName, string topic, object? data)
    {
        var envelope = CreateEnvelope(eventName, topic, data);
        foreach (var subscription in subscriptions.Values)
        {
            subscription.Writer.TryWrite(envelope);
        }
    }

    public EventSubscription Subscribe()
    {
        var subscriptionId = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<WorkerEventEnvelopeDto>(new UnboundedChannelOptions
        {
            AllowSynchronousContinuations = false,
            SingleReader = true,
            SingleWriter = false,
        });

        subscriptions[subscriptionId] = channel;
        return new EventSubscription(subscriptionId, channel.Reader, this);
    }

    private void Unsubscribe(Guid subscriptionId)
    {
        if (subscriptions.TryRemove(subscriptionId, out var channel))
        {
            channel.Writer.TryComplete();
        }
    }

    public sealed class EventSubscription : IDisposable
    {
        private readonly Guid subscriptionId;
        private readonly WorkerEventStreamBroker broker;
        private bool disposed;

        public EventSubscription(Guid subscriptionId, ChannelReader<WorkerEventEnvelopeDto> reader, WorkerEventStreamBroker broker)
        {
            this.subscriptionId = subscriptionId;
            this.broker = broker;
            Reader = reader;
        }

        public ChannelReader<WorkerEventEnvelopeDto> Reader { get; }

        public void Dispose()
        {
            if (disposed)
            {
                return;
            }

            disposed = true;
            broker.Unsubscribe(subscriptionId);
        }
    }
}
